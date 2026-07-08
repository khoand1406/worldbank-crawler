import { SyncJobRaw, SyncJob, WbDocumentDetailRaw, WbDocument, AuditLogEntry, AuditLogRaw } from "@/lib/types";

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

function splitTheme(theme: string | null): string[] | null {
  if (!theme) return null;

  const items = theme
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
}

export function mapDocumentDetail(raw: WbDocumentDetailRaw): WbDocument {
  return {
    id: raw.ID,
    source_type: raw.SourceType,

    api_document_key: raw.APIDocumentKey,
    display_title: raw.DisplayTitle,
    document_name: raw.DocName,
    report_number: raw.ReportNumber,

    doc_date: raw.DocDate,
    disclosure_date: raw.DisclosureDate,
    last_modified_date: raw.LastModifiedDate,
    date_stored: raw.DateStored,

    doc_type: raw.DocType,
    doc_type_key: raw.DocTypeKey,
    major_doc_type: raw.MajorDocType,

    country: raw.Country,
    countryKey: raw.CountryKey,
    region: raw.Region,

    project_id: raw.ProjectID,
    project_name: raw.ProjectName,

    language: raw.Language,
    theme: raw.themes && raw.themes.length > 0 ? raw.themes : splitTheme(raw.Theme),

    lending_instrument: raw.LendingInstrument,
    product_line: raw.ProductLine,

    security_class: raw.SecurityClass,
    version_type: raw.VersionType,
    disclosure_status: raw.DisclosureStatus,

    no_of_pages: raw.NoOfPages,

    pdf_url: raw.PDFURL,
    txt_url: raw.TXTURL,
    record_url: raw.RecordURL,

    abstract: raw.Abstract,
    authors: raw.Authors,
  };
}

export function mapAuditLog(raw: AuditLogRaw): AuditLogEntry {
  return {
    id: String(raw.ID),
    sync_job_id: String(raw.SyncJobID),
    action: raw.Action,
    status: raw.Status,
    http_status: raw.HTTPStatus,
    request_url: raw.RequestURL || null,
    document_id: raw.DocumentID || null,
    message: raw.Message || null,
    error_detail: raw.ErrorDetail || null,
    duration_ms: raw.DurationMS,
    created_at: raw.CreatedAt,
  };
}