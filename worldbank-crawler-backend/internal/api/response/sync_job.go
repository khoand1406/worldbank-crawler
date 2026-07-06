package response

type CreateSyncJobResponse struct {
	ID        int64  `json:"id"`
	Status    string `json:"status"`
	AutoStart bool   `json:"auto_start"`
}
