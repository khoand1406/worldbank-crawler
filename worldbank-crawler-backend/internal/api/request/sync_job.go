package request

import "worldbank-crawler/internal/model"

type CreateSyncJobRequest struct {
	SourceType  string              `json:"source_type"`
	TargetLimit int                 `json:"target_limit"`
	Params      model.SyncJobParams `json:"params"`
	AutoStart   *bool               `json:"auto_start,omitempty"`
}
