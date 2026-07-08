package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"worldbank-crawler/internal/api/handler"
	"worldbank-crawler/internal/api/router"
	"worldbank-crawler/internal/client"
	"worldbank-crawler/internal/config"
	"worldbank-crawler/internal/db"
	"worldbank-crawler/internal/repository"
	"worldbank-crawler/internal/service"
	"worldbank-crawler/internal/sse"

	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	appConfig, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("load config failed: %v", err)
	}

	rootCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	database, err := db.ConnectDB(rootCtx, appConfig)
	if err != nil {
		log.Fatalf("connect to database failed: %v", err)
	}
	defer database.Close()
	worldbankClient := client.NewClient(appConfig.WorldBankBaseURL)
	documentRepo := repository.NewWorldBankDocumentRepository(database)
	syncJobRepo := repository.NewSyncJobRepository(database)
	auditLogRepo := repository.NewAuditLogRepository(database)
	syncSourceRepo := repository.NewSyncSourceRepository(database)

	sseEventBroker := sse.NewBroker()

	syncService := service.NewSyncService(
		database,
		worldbankClient,
		documentRepo,
		auditLogRepo,
		syncJobRepo,
		syncSourceRepo,
		service.SyncServiceConfig{
			RowsPerPage:    appConfig.RowsPerPage,
			RequestDelay:   appConfig.RequestDelay,
			MaxJobLimit:    appConfig.MaxJobLimit,
			SyncJobTimeout: appConfig.SyncJobTimeout,
		},
		sseEventBroker,
	)

	syncjobHandler := handler.NewSyncJobHandler(syncService, syncJobRepo, auditLogRepo)
	documentHandler := handler.NewDocumentHandler(documentRepo)
	router := router.NeuRouter(router.RouteDependency{
		SyncJobHandler:  syncjobHandler,
		DocumentHandler: documentHandler,
		EventBroker:     sseEventBroker,
	})

	server := &http.Server{
		Addr:         appConfig.ServerAddr,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	go func() {
		log.Printf("server started addr=%s env=%s", appConfig.ServerAddr, appConfig.AppEnv)

		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("server listen failed: %v", err)
		}
	}()
	<-rootCtx.Done()

	log.Println("server shutting down...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Printf("server shutdown failed: %v", err)
		return
	}
	log.Println("server stopped")

}
