import { mapSyncJob, mapDocumentDetail, mapAuditLog } from "@/helper/mapper";
import {
  AuditLogRawResponse,
  AuditLogResponse,
  CreateSyncJobPayload,
  DocumentFilters,
  DocumentListResponse,
  SyncJob,
  SyncJobListRawResponse,
  SyncJobListResponse,
  SyncJobMinialResponse,
  SyncJobRaw,
  WbDocument,
  WbDocumentDetailRaw,
} from "./types";
import { AppConfig } from "@/config/app.config";

const API_BASE_URL = AppConfig.apiBaseUrl;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      `Khong the ket noi backend tai ${API_BASE_URL}. Kiem tra bien moi truong NEXT_PUBLIC_API_BASE_URL va trang thai backend.`,
      0,
    );
  }

  if (!res.ok) {
    let message = `Yeu cau that bai (HTTP ${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore parse errors, use default message
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  listDocuments(filters: DocumentFilters): Promise<DocumentListResponse> {
    const qs = buildQuery({
      page: filters.page,
      page_size: filters.page_size,

      q: filters.q,

      source_type: filters.source_type,
      country_key: filters.country_key,
      region: filters.region,

      major_doc_type: filters.major_doc_type,
      doc_type: filters.doc_type,

      language: filters.language,

      doc_date_from: filters.doc_date_from,
      doc_date_to: filters.doc_date_to,

      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
    });

    return request<DocumentListResponse>(`/api/documents${qs}`);
  },

  async getDocument(id: string): Promise<WbDocument> {
    const res = await request<WbDocumentDetailRaw>(
      `/api/documents/${encodeURIComponent(id)}`,
    );

    return mapDocumentDetail(res);
  },

  async listSyncJobs(page = 1, pageSize = 20): Promise<SyncJobListResponse> {
    const offset = (page - 1) * pageSize;

    const qs = buildQuery({
      limit: pageSize,
      offset,
    });

    const res = await request<SyncJobListRawResponse>(`/api/sync-jobs${qs}`);

    return {
      data: res.items.map(mapSyncJob),
      total: res.items.length,
      limit: res.limit,
      offset: res.offset,
    };
  },

  async getSyncJob(id: string): Promise<SyncJob> {
  const res = await request<SyncJobRaw>(
    `/api/sync-jobs/${encodeURIComponent(id)}`
  );

  return mapSyncJob(res);
},

  createSyncJob(payload: CreateSyncJobPayload): Promise<SyncJob> {
    return request<SyncJob>(`/api/sync-jobs`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  runSyncJob(id: number):Promise<SyncJobMinialResponse>{
    return request<SyncJobMinialResponse>(`/api/sync-jobs/${encodeURIComponent(id)}/run`, {
      method: "POST",
    });
  },

  cancelSyncJob(id: number):Promise<SyncJobMinialResponse>{
    return request<SyncJobMinialResponse>(`/api/sync-jobs/${encodeURIComponent(id)}/cancel`,{
      method: "POST",
    })
  },

  async getSyncJobAudit(
    id: string,
    page = 1,
    pageSize = 50,
  ): Promise<AuditLogResponse> {
    const offset = (page - 1) * pageSize;

    const qs = buildQuery({
      limit: pageSize,
      offset,
    });

    const res = await request<AuditLogRawResponse>(
      `/api/sync-jobs/${encodeURIComponent(id)}/audit${qs}`,
    );

    return {
      data: res.items.map(mapAuditLog),
      total: res.total ?? res.items.length,
      page: res.page ?? page,
      page_size: res.page_size ?? pageSize,
    };
  },
};
