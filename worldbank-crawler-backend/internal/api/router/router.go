package router

import (
	"net/http"
	"worldbank-crawler/internal/api"
	"worldbank-crawler/internal/api/handler"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

type RouteDependency struct {
	SyncJobHandler  *handler.SyncJobHandler
	DocumentHandler *handler.DocumentHandler
}

func NeuRouter(deps RouteDependency) http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		api.WriteJSON(w, http.StatusOK, map[string]any{
			"status": "ok",
		})
	})
	r.Route("/api", func(r chi.Router) {
		r.Route("/sync-jobs", func(r chi.Router) {
			r.Post("/", deps.SyncJobHandler.CreateSyncJob)
			r.Get("/", deps.SyncJobHandler.ListSyncJobs)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", deps.SyncJobHandler.GetSyncJob)
				r.Post("/run", deps.SyncJobHandler.RunSyncJob)
				r.Get("/progress", deps.SyncJobHandler.GetSyncJobProgress)
				r.Get("/audit", deps.SyncJobHandler.ListAuditLogs)
			})
		})
		r.Route("/documents", func(r chi.Router) {
			r.Get("/", deps.DocumentHandler.ListDocuments)
			r.Get("/{id}", deps.DocumentHandler.GetDocument)
		})
	})
	return r
}
