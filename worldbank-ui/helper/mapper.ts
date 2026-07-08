import { SyncJobRaw, SyncJob } from "@/lib/types";

export function mapSyncJob(raw: SyncJobRaw): SyncJob {
  return {
    id: String(raw.ID),
    source_type: raw.SourceType,
    params: raw.Params,
    status: raw.Status,
    target_limit: raw.TargetLimit,
    total_available: raw.TotalAvailable,
    fetched: raw.Fetched,
    inserted: raw.Inserted,
    updated: raw.Updated,
    failed_count: raw.FailedCount,
    current_offset: raw.CurrentOffset,
    started_at: raw.StartedAt,
    finished_at: raw.FinishedAt,
    error: raw.Error,
    created_at: raw.CreatedAt,
    updated_at: raw.UpdatedAt,
  };
}