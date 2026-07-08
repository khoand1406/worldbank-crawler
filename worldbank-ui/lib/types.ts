export type SourceType = "A" | "B";

export type SyncJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type AuditAction = "API_CALL" | "DB_INSERT" | "DB_UPDATE";
export type AuditStatus = "SUCCESS" | "ERROR";

export interface WbDocument {
  id: string;
  display_title: string;
  docdt: string | null;
  docty: string | null;
  docty_key: string | null;
  majdocty: string | null;
  count: string | null;
  count_key: string | null;
  admreg: string | null;
  projn: string | null;
  lang: string | null;
  theme: string[] | null;
  lndinstr: string | null;
  prdln: string | null;
  disclosure_date: string | null;
  disclstat: string | null;
  no_of_pages: number | null;
  pdfurl: string | null;
  txturl: string | null;
  url: string | null;
  source_type: SourceType;
}

export interface DocumentListResponse {
  items: WbDocument[];
  total: number;
  page: number;
  page_size: number;
}

export interface DocumentFilters {
  q?: string;
  country_key?: string;
  admreg?: string;
  majdocty?: string;
  source_type?: SourceType | "";
  lang?: string;
  strdate?: string;
  enddate?: string;
  page?: number;
  page_size?: number;
}

export interface SyncJobParams {
  qterm?: string;
  count_exact?: string;
  strdate?: string;
  enddate?: string;
  majdocty_exact?: string;
  docty_exact?: string;
  lang_exact?: string;
}

export interface SyncJob {
  id: string;
  source_type: SourceType;
  params: SyncJobParams;
  status: SyncJobStatus;
  target_limit: number;
  total_available: number | null;
  fetched: number;
  inserted: number;
  updated: number;
  failed_count: number;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
}

export interface SyncJobListResponse {
  data: SyncJob[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateSyncJobPayload {
  source_type: SourceType;
  target_limit: number;
  params: SyncJobParams;
}

export interface AuditLogEntry {
  id: string;
  sync_job_id: string;
  action: AuditAction;
  status: AuditStatus;
  http_status: number | null;
  request_url: string | null;
  document_id: string | null;
  message: string | null;
  error_detail: string | null;
  duration_ms: number | null;
  created_at: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
}
