import { mapSyncJob } from "@/helper/mapper";
import { AuditLogResponse, CreateSyncJobPayload, DocumentFilters, DocumentListResponse, SyncJob, SyncJobListRawResponse, SyncJobListResponse, WbDocument } from "./types";


const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

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
      0
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
      q: filters.q,
      country_key: filters.country_key,
      admreg: filters.admreg,
      majdocty: filters.majdocty,
      source_type: filters.source_type,
      lang: filters.lang,
      strdate: filters.strdate,
      enddate: filters.enddate,
      page: filters.page,
      page_size: filters.page_size,
    });
    return request<DocumentListResponse>(`/api/documents${qs}`);
  },

  getDocument(id: string): Promise<WbDocument> {
    return request<WbDocument>(`/api/documents/${encodeURIComponent(id)}`);
  },

  async listSyncJobs(
  page = 1,
  pageSize = 20
): Promise<SyncJobListResponse> {
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

  getSyncJob(id: string): Promise<SyncJob> {
    return request<SyncJob>(`/api/sync-jobs/${encodeURIComponent(id)}`);
  },

  createSyncJob(payload: CreateSyncJobPayload): Promise<SyncJob> {
    return request<SyncJob>(`/api/sync-jobs`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // FR-2: nhat ky van hanh cua mot luot dong bo
  getSyncJobAudit(
    id: string,
    page = 1,
    pageSize = 50
  ): Promise<AuditLogResponse> {
    const qs = buildQuery({ page, page_size: pageSize });
    return request<AuditLogResponse>(
      `/api/sync-jobs/${encodeURIComponent(id)}/audit${qs}`
    );
  },
};
