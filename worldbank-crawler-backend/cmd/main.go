package main

import (
	"context"
	"log"
	"time"

	"worldbank-crawler/internal/client"
	"worldbank-crawler/internal/config"
	"worldbank-crawler/internal/db"
	"worldbank-crawler/internal/repository"
	"worldbank-crawler/internal/service"

	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
)

func main() {
	_ = godotenv.Load()

	appConfig, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("load config failed: %v", err)
	}

	database, err := db.ConnectDB(appConfig)
	if err != nil {
		log.Fatalf("connect to database failed: %v", err)
	}
	defer database.Close()

	worldBankClient := client.NewClient(appConfig.WorldBankURL)

	worldBankRepo := repository.NewWorldBankDocumentRepository(database)
	crawlLogRepo := repository.NewCrawlLogRepository(database)

	crawlService := service.NewWorldBankCrawlService(
		worldBankClient,
		worldBankRepo,
		crawlLogRepo,
		service.WorldbankCrawlServiceConfig{
			RowsPerPage:  appConfig.RowsPerPage,
			MaxPages:     appConfig.MaxPages,
			QTerm:        appConfig.QTerm,
			StrDate:      appConfig.StrDate,
			EndDate:      appConfig.EndDate,
			RequestDelay: appConfig.RequestDelay,
		},
	)

	if appConfig.RunOnStartup {
		runCrawlWithTimeout(crawlService, appConfig, appConfig.CrawlTimeout, "initial")
	}

	c := cron.New()

	_, err = c.AddFunc(appConfig.CronSchedule, func() {
		runCrawlWithTimeout(crawlService, appConfig, appConfig.CrawlTimeout, "scheduled")
	})

	if err != nil {
		log.Fatalf("failed to add cron job: %v", err)
	}

	c.Start()

	log.Printf("WorldBank crawler started. cron=%s", appConfig.CronSchedule)

	select {}
}

func runCrawlWithTimeout(
	crawlService *service.WorldBankCrawlService,
	appConfig config.AppConfig,
	timeout time.Duration,
	label string,
) {
	runCtx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	if appConfig.CrawlMode == "full_by_year" {
		err := crawlService.CrawlAllByYear(
			runCtx,
			appConfig.StartYear,
			appConfig.EndYear,
		)
		if err != nil {
			log.Printf("%s full crawl failed: %v", label, err)
		}
		return
	}

	if err := crawlService.Crawl(runCtx); err != nil {
		log.Printf("%s crawl failed: %v", label, err)
	}
}
