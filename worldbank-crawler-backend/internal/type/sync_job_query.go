package types

import "worldbank-crawler/internal/model"

type SyncJobFilterQuery struct {
	Limit  int
	Offset int

	Status     model.SyncJobStatus
	SourceType string
}
