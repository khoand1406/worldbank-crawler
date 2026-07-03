package model

import "time"

type AuditAction string

const (
	AuditActionAPICall  AuditAction = "API_CALL"
	AuditActionDBInsert AuditAction = "DB_INSERT"
	AuditActionDBUpdate AuditAction = "DB_UPDATE"
	AuditActionDBError  AuditAction = "DB_ERROR"
)

type AuditStatus string

const (
	AuditStatusSuccess AuditStatus = "SUCCESS"
	AuditStatusError   AuditStatus = "ERROR"
)

type AuditLog struct {
	ID int64

	SyncJobID int64

	Action AuditAction
	Status AuditStatus

	HTTPStatus *int

	RequestURL string

	DocumentID string

	Message     string
	ErrorDetail string

	DurationMS int

	CreatedAt time.Time
}

type CreateAuditLogInput struct {
	SyncJobID int64

	Action AuditAction
	Status AuditStatus

	HTTPStatus *int

	RequestURL string

	DocumentID string

	Message     string
	ErrorDetail string

	DurationMS int
}
