package model

import "time"

type SyncSource struct {
	ID          int64
	SourceType  string
	Name        string
	FilterField string
	FilterValue string
	Enabled     bool
	CreatedAt   *time.Time
	UpdatedAt   *time.Time
}
