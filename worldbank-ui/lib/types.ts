export type SourceType = "PROJECT_DOCUMENTS" | "PUBLICATIONS_RESEARCH";

export type SyncJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type AuditAction = "API_CALL" | "DB_BATCH" | "DB_INSERT" | "DB_UPDATE";
export type AuditStatus = "SUCCESS" | "ERROR";

export interface WbDocument {
  id: string;
  source_type: SourceType;

  api_document_key?: string | null;
  display_title: string;
  document_name?: string | null;
  report_number?: string | null;

  doc_date: string | null;
  disclosure_date?: string | null;
  last_modified_date?: string | null;
  date_stored?: string | null;

  doc_type: string | null;
  doc_type_key?: string | null;
  major_doc_type: string | null;

  country: string | null;
  countryKey?: string | null;
  region: string | null;

  project_id?: string | null;
  project_name?: string | null;

  language: string | null;
  theme?: string[] | null;

  lending_instrument?: string | null;
  product_line?: string | null;

  security_class?: string | null;
  version_type?: string | null;
  disclosure_status?: string | null;

  no_of_pages?: number | null;

  pdf_url: string | null;
  txt_url?: string | null;
  record_url: string | null;

  abstract?: string | null;
  authors?: string[] | null;
}

export interface WbDocumentDetailRaw {
  ID: string;
  SourceType: SourceType;

  APIDocumentKey: string | null;
  DisplayTitle: string;
  DocName: string | null;
  ReportNumber: string | null;

  DocDate: string | null;
  DisclosureDate: string | null;
  LastModifiedDate: string | null;
  DateStored: string | null;

  DocType: string | null;
  DocTypeKey: string | null;
  MajorDocType: string | null;

  Country: string | null;
  CountryKey: string | null;
  Region: string | null;

  ProjectID: string | null;
  ProjectName: string | null;

  Language: string | null;
  Theme: string | null;

  LendingInstrument: string | null;
  ProductLine: string | null;

  SecurityClass: string | null;
  VersionType: string | null;
  DisclosureStatus: string | null;

  NoOfPages: number | null;

  PDFURL: string | null;
  TXTURL: string | null;
  RecordURL: string | null;

  Abstract: string | null;
  Authors: string[] | null;

  themes?: string[];
}

export interface DocumentListResponse {
  items: WbDocument[];
  page: number;
  page_size: number;
  total: number;
}

export interface DocumentFilters {
  q?: string;

  source_type?: SourceType | "";

  country_key?: string;
  region?: string;

  major_doc_type?: string;
  doc_type?: string;

  language?: string;

  doc_date_from?: string;
  doc_date_to?: string;

  sort_by?: "doc_date" | "disclosure_date" | "last_modified_date" | "country" | "doc_type" | "created_at" | "";
  sort_order?: "asc" | "desc" | "";

  page?: number;
  page_size?: number;
}

export interface SyncJobParams {
  qterm?: string;

  strdate?: string;
  enddate?: string;

  country_key?: string;
  language?: string;

  major_doc_type?: string;
  doc_type?: string;

  sort?: string;
  order?: string;
}

export interface CreateSyncJobPayload {
  source_type: SourceType;
  target_limit: number;
  params: SyncJobParams;
  auto_start?: boolean;
}
export interface SyncJobRaw {
  ID: number;
  SourceType: SourceType;
  Params: SyncJobParams;
  Status: SyncJobStatus;
  TargetLimit: number;
  TotalAvailable: number | null;
  Fetched: number;
  Inserted: number;
  Updated: number;
  FailedCount: number;
  CurrentOffset: number;
  StartedAt: string | null;
  FinishedAt: string | null;
  Error: string | null;
  CreatedAt: string;
  UpdatedAt: string;
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
  current_offset: number;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyncJobListRawResponse {
  items: SyncJobRaw[];
  limit: number;
  offset: number;
}

export interface SyncJobListResponse {
  data: SyncJob[];
  total: number;
  limit: number;
  offset: number;
}

export interface CreateSyncJobPayload {
  source_type: SourceType;
  target_limit: number;
  params: SyncJobParams;
}

export interface AuditLogRaw {
  ID: number;
  SyncJobID: number;
  Action: AuditAction;
  Status: AuditStatus;
  HTTPStatus: number | null;
  RequestURL: string;
  DocumentID: string;
  Message: string;
  ErrorDetail: string;
  DurationMS: number;
  CreatedAt: string;
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

export interface AuditLogRawResponse {
  items: AuditLogRaw[];
  page?: number;
  page_size?: number;
  total?: number;
  limit?: number;
  offset?: number;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
}