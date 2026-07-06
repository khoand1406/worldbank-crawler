package handler

import (
	"net/http"
	"time"
	"worldbank-crawler/internal/api"
	"worldbank-crawler/internal/repository"
	types "worldbank-crawler/internal/type"

	"github.com/go-chi/chi/v5"
)

type DocumentHandler struct {
	documentRepo *repository.WorldBankDocumentRepository
}

func NewDocumentHandler(documentRepo *repository.WorldBankDocumentRepository) *DocumentHandler {
	return &DocumentHandler{
		documentRepo: documentRepo,
	}
}

func (h *DocumentHandler) ListDocuments(w http.ResponseWriter, r *http.Request) {
	query := types.DocumentListQuery{
		Page:         parseIntQuery(r, "page", 1),
		PageSize:     parseIntQuery(r, "page_size", 20),
		SourceType:   r.URL.Query().Get("source_type"),
		CountryKey:   r.URL.Query().Get("country_key"),
		Region:       r.URL.Query().Get("region"),
		MajorDocType: r.URL.Query().Get("major_doc_type"),
		DocType:      r.URL.Query().Get("doc_type"),
		Language:     r.URL.Query().Get("language"),
		TitleKeyword: r.URL.Query().Get("q"),
		SortBy:       r.URL.Query().Get("sort_by"),
		SortOrder:    r.URL.Query().Get("sort_order"),
	}

	if value := r.URL.Query().Get("doc_date_from"); value != "" {
		t, err := time.Parse("2006-01-02", value)
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid doc_date_from, expected YYYY-MM-DD")
			return
		}
		query.DocDateFrom = &t
	}

	if value := r.URL.Query().Get("doc_date_to"); value != "" {
		t, err := time.Parse("2006-01-02", value)
		if err != nil {
			api.WriteError(w, http.StatusBadRequest, "invalid doc_date_to, expected YYYY-MM-DD")
			return
		}
		query.DocDateTo = &t
	}

	result, err := h.documentRepo.ListDocuments(r.Context(), query)
	if err != nil {
		api.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}

	api.WriteJSON(w, http.StatusOK, result)
}

func (h *DocumentHandler) GetDocument(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		api.WriteError(w, http.StatusBadRequest, "document id is required")
		return
	}

	doc, err := h.documentRepo.FindDocumentByID(r.Context(), id)
	if err != nil {
		api.WriteError(w, http.StatusNotFound, err.Error())
		return
	}

	api.WriteJSON(w, http.StatusOK, doc)
}
