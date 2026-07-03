package model

import (
	"encoding/json"
	"time"
)

type SyncJobStatus string

const (
	SyncJobStatusPending   SyncJobStatus = "PENDING"
	SyncJobStatusRunning   SyncJobStatus = "RUNNING"
	SyncJobStatusCompleted SyncJobStatus = "COMPLETED"
	SyncJobStatusFailed    SyncJobStatus = "FAILED"
	SyncJobStatusCancelled SyncJobStatus = "CANCELLED"
)

type SyncJob struct {
	ID int64

	SourceType string

	Params json.RawMessage

	Status SyncJobStatus

	TargetLimit    int
	TotalAvailable int

	Fetched     int
	Inserted    int
	Updated     int
	FailedCount int

	CurrentOffset int

	StartedAt  *time.Time
	FinishedAt *time.Time

	Error *string

	CreatedAt time.Time
	UpdatedAt time.Time
}

type SyncJobParams struct {
	QTerm string `json:"qterm,omitempty"`

	StrDate string `json:"strdate,omitempty"`
	EndDate string `json:"enddate,omitempty"`

	CountryKey string `json:"country_key,omitempty"`
	Language   string `json:"language,omitempty"`

	MajorDocType string `json:"major_doc_type,omitempty"`
	DocType      string `json:"doc_type,omitempty"`

	Sort  string `json:"sort,omitempty"`
	Order string `json:"order,omitempty"`
}

type CreateSyncJobInput struct {
	SourceType  string        `json:"source_type"`
	TargetLimit int           `json:"target_limit"`
	Params      SyncJobParams `json:"params"`
}

type SyncJobProgress struct {
	JobID int64 `json:"job_id"`

	Status SyncJobStatus `json:"status"`

	TargetLimit int `json:"target_limit"`

	TotalAvailable int `json:"total_available"`

	Fetched     int `json:"fetched"`
	Inserted    int `json:"inserted"`
	Updated     int `json:"updated"`
	FailedCount int `json:"failed_count"`

	CurrentOffset int `json:"current_offset"`

	StartedAt  *time.Time `json:"started_at"`
	FinishedAt *time.Time `json:"finished_at"`

	Error *string `json:"error"`
}
