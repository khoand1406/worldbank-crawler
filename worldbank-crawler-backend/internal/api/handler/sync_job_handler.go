package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"worldbank-crawler/internal/api"
	"worldbank-crawler/internal/api/request"
	"worldbank-crawler/internal/api/response"
	"worldbank-crawler/internal/model"
	"worldbank-crawler/internal/repository"
	"worldbank-crawler/internal/service"
	types "worldbank-crawler/internal/type"

	"github.com/go-chi/chi/v5"
)

type SyncJobHandler struct {
	syncService *service.SyncService
	syncJobRepo *repository.SyncJobRepository
	auditRepo   *repository.AuditLogRepository
}

func NewSyncJobHandler(
	syncService *service.SyncService,
	syncJobRepo *repository.SyncJobRepository,
	auditRepo *repository.AuditLogRepository,
) *SyncJobHandler {
	return &SyncJobHandler{
		syncService: syncService,
		syncJobRepo: syncJobRepo,
		auditRepo:   auditRepo,
	}
}

func (h *SyncJobHandler) CreateSyncJob(w http.ResponseWriter, r *http.Request) {
	var req request.CreateSyncJobRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.SourceType == "" {
		api.WriteError(w, http.StatusBadRequest, "source_type is required")
		return
	}

	if req.TargetLimit <= 0 {
		req.TargetLimit = 10000
	}

	if req.TargetLimit > 10000 {
		api.WriteError(w, http.StatusBadRequest, "target_limit must be less than or equal to 10000")
		return
	}

	jobID, err := h.syncService.CreateJob(r.Context(), model.CreateSyncJobInput{
		SourceType:  req.SourceType,
		TargetLimit: req.TargetLimit,
		Params:      req.Params,
	})
	if err != nil {
		api.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	autoStart := true
	if req.AutoStart != nil {
		autoStart = *req.AutoStart
	}

	if autoStart {
		go func(id int64) {
			ctx, cancel := context.WithTimeout(context.Background(), h.syncService.JobTimeout())
			defer cancel()

			if err := h.syncService.RunJob(ctx, id); err != nil {
				log.Printf("run sync job failed: job_id=%d error=%v", id, err)
			}
		}(jobID)
	}

	api.WriteJSON(w, http.StatusCreated, response.CreateSyncJobResponse{
		ID:        jobID,
		Status:    string(model.SyncJobStatusPending),
		AutoStart: autoStart,
	})
}

func (h *SyncJobHandler) RunSyncJob(w http.ResponseWriter, r *http.Request) {
	jobID, ok := parseIDParam(w, r, "id")
	if !ok {
		return
	}

	go func(id int64) {
		ctx, cancel := context.WithTimeout(context.Background(), h.syncService.JobTimeout())
		defer cancel()

		if err := h.syncService.RunJob(ctx, id); err != nil {
			log.Printf("run sync job failed: job_id=%d error=%v", id, err)
		}
	}(jobID)

	api.WriteJSON(w, http.StatusAccepted, map[string]any{
		"id":      jobID,
		"message": "sync job started",
	})
}

func (h *SyncJobHandler) GetSyncJob(w http.ResponseWriter, r *http.Request) {
	jobID, ok := parseIDParam(w, r, "id")
	if !ok {
		return
	}

	job, err := h.syncJobRepo.FindByID(r.Context(), jobID)
	if err != nil {
		api.WriteError(w, http.StatusNotFound, err.Error())
		return
	}

	api.WriteJSON(w, http.StatusOK, job)
}

func (h *SyncJobHandler) GetSyncJobProgress(w http.ResponseWriter, r *http.Request) {
	jobID, ok := parseIDParam(w, r, "id")
	if !ok {
		return
	}

	progress, err := h.syncJobRepo.GetProgress(r.Context(), jobID)
	if err != nil {
		api.WriteError(w, http.StatusNotFound, err.Error())
		return
	}

	api.WriteJSON(w, http.StatusOK, progress)
}

func (h *SyncJobHandler) ListSyncJobs(w http.ResponseWriter, r *http.Request) {
	limit := parseIntQuery(r, "limit", 20)
	offset := parseIntQuery(r, "offset", 0)

	filter := types.SyncJobFilterQuery{
		Limit:      parseIntQuery(r, "limit", limit),
		Offset:     parseIntQuery(r, "offset", offset),
		Status:     model.SyncJobStatus(r.URL.Query().Get("status")),
		SourceType: r.URL.Query().Get("source_type"),
	}

	jobs, err := h.syncJobRepo.List(r.Context(), filter)
	if err != nil {
		api.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	total, err := h.syncJobRepo.CountTotal(r.Context(), filter)
	if err != nil {
		api.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.WriteJSON(w, http.StatusOK, map[string]any{
		"items":  jobs,
		"limit":  limit,
		"total":  total,
		"offset": offset,
	})
}

func (h *SyncJobHandler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	jobID, ok := parseIDParam(w, r, "id")
	if !ok {
		return
	}

	limit := parseIntQuery(r, "limit", 50)
	offset := parseIntQuery(r, "offset", 0)

	logs, err := h.auditRepo.ListBySyncJobId(r.Context(), jobID, limit, offset)
	if err != nil {
		api.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	total, err := h.auditRepo.CountBySyncJobID(r.Context(), jobID)
	if err != nil {
		api.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.WriteJSON(w, http.StatusOK, map[string]any{
		"items":  logs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

func parseIDParam(w http.ResponseWriter, r *http.Request, name string) (int64, bool) {
	rawID := chi.URLParam(r, name)

	id, err := strconv.ParseInt(rawID, 10, 64)
	if err != nil || id <= 0 {
		api.WriteError(w, http.StatusBadRequest, "invalid id")
		return 0, false
	}

	return id, true
}

func parseIntQuery(r *http.Request, name string, defaultValue int) int {
	raw := r.URL.Query().Get(name)
	if raw == "" {
		return defaultValue
	}

	value, err := strconv.Atoi(raw)
	if err != nil {
		return defaultValue
	}

	return value
}
