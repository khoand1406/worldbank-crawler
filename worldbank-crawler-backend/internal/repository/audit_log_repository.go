package repository

import (
	"context"
	"database/sql"
	"fmt"
	"worldbank-crawler/internal/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type AuditLogRepository struct {
	db *pgxpool.Pool
}

func NewAuditLogRepository(db *pgxpool.Pool) *AuditLogRepository {
	return &AuditLogRepository{db: db}
}

func (r *AuditLogRepository) Create(ctx context.Context, input model.CreateAuditLogInput) error {
	query := `
	INSERT INTO audit_logs (
			sync_job_id,
			action,
			status,
			http_status,
			request_url,
			document_id,
			message,
			error_detail,
			duration_ms
		)
		VALUES (
			$1,
			$2,
			$3,
			$4,
			$5,
			$6,
			$7,
			$8,
			$9
		)
	`

	_, err := r.db.Exec(
		ctx,
		query,
		input.SyncJobID,
		input.Action,
		input.Status,
		input.HTTPStatus,
		nullIfEmpty(input.RequestURL),
		nullIfEmpty(input.DocumentID),
		nullIfEmpty(input.Message),
		nullIfEmpty(input.ErrorDetail),
		input.DurationMS,
	)

	if err != nil {
		return fmt.Errorf("create audit log failed: %w", err)
	}

	return nil
}

func (r *AuditLogRepository) LogApiCall(ctx context.Context, syncJobId int64, requestUrl string, httpstatus int, durationMs int, err error) error {
	status := model.AuditStatusSuccess
	message := "World Bank API call succeeded"
	errorDetail := ""

	if err != nil {
		status = model.AuditStatusError
		message = "World Bank API call failed"
		errorDetail = err.Error()
	}

	return r.Create(ctx, model.CreateAuditLogInput{
		SyncJobID:   syncJobId,
		Action:      model.AuditActionAPICall,
		Status:      status,
		HTTPStatus:  &httpstatus,
		RequestURL:  requestUrl,
		Message:     message,
		ErrorDetail: errorDetail,
		DurationMS:  durationMs,
	})
}

func (r *AuditLogRepository) LogDBInsert(
	ctx context.Context,
	syncJobID int64,
	documentID string,
) error {
	return r.Create(ctx, model.CreateAuditLogInput{
		SyncJobID:  syncJobID,
		Action:     model.AuditActionDBInsert,
		Status:     model.AuditStatusSuccess,
		DocumentID: documentID,
		Message:    "Document inserted",
	})
}

func (r *AuditLogRepository) LogDBUpdate(
	ctx context.Context,
	syncJobID int64,
	documentID string,
) error {
	return r.Create(ctx, model.CreateAuditLogInput{
		SyncJobID:  syncJobID,
		Action:     model.AuditActionDBUpdate,
		Status:     model.AuditStatusSuccess,
		DocumentID: documentID,
		Message:    "Document updated",
	})
}

func (r *AuditLogRepository) LogDBError(
	ctx context.Context,
	syncJobID int64,
	documentID string,
	err error,
) error {
	errorDetail := ""
	if err != nil {
		errorDetail = err.Error()
	}

	return r.Create(ctx, model.CreateAuditLogInput{
		SyncJobID:   syncJobID,
		Action:      model.AuditActionDBError,
		Status:      model.AuditStatusError,
		DocumentID:  documentID,
		Message:     "Database operation failed",
		ErrorDetail: errorDetail,
	})
}

func (r *AuditLogRepository) ListBySyncJobId(ctx context.Context, syncJobID int64, limit int, offset int) ([]model.AuditLog, error) {
	if limit <= 0 {
		limit = 50
	}

	if limit > 200 {
		limit = 200
	}

	if offset < 0 {
		offset = 0
	}
	query := `
		SELECT
			id,
			sync_job_id,
			action,
			status,
			http_status,
			request_url,
			document_id,
			message,
			error_detail,
			duration_ms,
			created_at
		FROM audit_logs
		WHERE sync_job_id = $1
		ORDER BY created_at ASC, id ASC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, syncJobID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list audit logs sync_job_id=%d failed: %w", syncJobID, err)
	}
	defer rows.Close()
	logs := make([]model.AuditLog, 0)
	for rows.Next() {
		var item model.AuditLog
		var action string
		var status string
		var httpStatus sql.NullInt64
		var requestURL sql.NullString
		var documentID sql.NullString
		var message sql.NullString
		var errorDetail sql.NullString
		err := rows.Scan(&item.ID,
			&item.SyncJobID,
			&action,
			&status,
			&httpStatus,
			&requestURL,
			&documentID,
			&message,
			&errorDetail)
		if err != nil {
			return nil, fmt.Errorf("scan audit log failed: %w", err)
		}
		item.Action = model.AuditAction(action)
		item.Status = model.AuditStatus(status)
		if httpStatus.Valid {
			value := int(httpStatus.Int64)
			item.HTTPStatus = &value
		}
		if requestURL.Valid {
			item.RequestURL = requestURL.String
		}

		if documentID.Valid {
			item.DocumentID = documentID.String
		}

		if message.Valid {
			item.Message = message.String
		}

		if errorDetail.Valid {
			item.ErrorDetail = errorDetail.String
		}

		logs = append(logs, item)

	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate audit logs failed: %w", err)
	}

	return logs, nil
}

func (r *AuditLogRepository) CountBySyncJobID(
	ctx context.Context,
	syncJobID int64,
) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM audit_logs
		WHERE sync_job_id = $1
	`

	var total int

	err := r.db.QueryRow(ctx, query, syncJobID).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("count audit logs sync_job_id=%d failed: %w", syncJobID, err)
	}

	return total, nil
}

func nullIfEmpty(value string) interface{} {
	if value == "" {
		return nil
	}

	return value
}
