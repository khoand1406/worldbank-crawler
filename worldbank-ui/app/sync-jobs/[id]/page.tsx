"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { AuditLogEntry, SyncJob } from "@/lib/types";
import {
  formatDateTime,
  formatDuration,
  formatNumber,
  sourceTypeLabel,
} from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import StampId from "@/components/StampId";
import EmptyState from "@/components/EmptyState";
import Pagination from "@/components/Pagination";

const AUDIT_PAGE_SIZE = 25;
const POLL_INTERVAL_MS = 4000;
const ACTIVE_STATUSES = new Set(["PENDING", "RUNNING"]);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="font-mono text-lg text-ink">{value}</p>
    </div>
  );
}

export default function SyncJobDetailPage() {
  const params = useParams<{ id: string }>();
  const [job, setJob] = useState<SyncJob | null>(null);
  const [jobLoading, setJobLoading] = useState(true);
  const [jobError, setJobError] = useState<string | null>(null);

  const [auditPage, setAuditPage] = useState(1);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadJob = useCallback(() => {
    api
      .getSyncJob(params.id)
      .then((res) => {
        setJob(res);
        setJobError(null);
      })
      .catch((err: unknown) => {
        setJobError(
          err instanceof ApiError ? err.message : "Đã xảy ra lỗi không xác định."
        );
      })
      .finally(() => setJobLoading(false));
  }, [params.id]);

  const loadAudit = useCallback(() => {
    setAuditLoading(true);
    api
      .getSyncJobAudit(params.id, auditPage, AUDIT_PAGE_SIZE)
      .then((res) => {
        setAuditEntries(res.data);
        setAuditTotal(res.total);
        setAuditError(null);
      })
      .catch((err: unknown) => {
        setAuditEntries([]);
        setAuditTotal(0);
        setAuditError(
          err instanceof ApiError ? err.message : "Đã xảy ra lỗi không xác định."
        );
      })
      .finally(() => setAuditLoading(false));
  }, [params.id, auditPage]);

  useEffect(() => {
    loadJob();
  }, [loadJob]);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  // Poll while the job is still pending/running so progress stays fresh.
  useEffect(() => {
    if (!job || !ACTIVE_STATUSES.has(job.status)) return;
    const interval = setInterval(() => {
      loadJob();
      loadAudit();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [job, loadJob, loadAudit]);

  const filteredEntries = auditEntries.filter((entry) => {
    if (actionFilter && entry.action !== actionFilter) return false;
    if (statusFilter && entry.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <Link href="/sync-jobs" className="mb-6 inline-block text-[13px] text-signal hover:underline">
        ← Quay lại danh sách lượt đồng bộ
      </Link>

      {jobLoading ? (
        <div className="card p-10">
          <EmptyState title="Đang tải chi tiết lượt đồng bộ…" />
        </div>
      ) : jobError || !job ? (
        <div className="card p-10">
          <EmptyState
            tone="error"
            title="Không tải được lượt đồng bộ"
            description={jobError ?? "Không tìm thấy lượt đồng bộ."}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="card p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <StampId value={job.id} />
                <StatusBadge status={job.status} />
              </div>
              <span className="text-[13px] text-ink-soft/60">
                {sourceTypeLabel(job.source_type)}
              </span>
            </div>

            <ProgressBar fetched={job.fetched} target={job.target_limit} />

            <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
              <Stat label="Đã lấy / mục tiêu" value={`${formatNumber(job.fetched)} / ${formatNumber(job.target_limit)}`} />
              <Stat label="Tổng số API báo có" value={formatNumber(job.total_available)} />
              <Stat label="Thêm mới" value={formatNumber(job.inserted)} />
              <Stat label="Cập nhật" value={formatNumber(job.updated)} />
              <Stat label="Lỗi" value={formatNumber(job.failed_count)} />
              <Stat label="Bắt đầu" value={formatDateTime(job.started_at)} />
              <Stat label="Kết thúc" value={formatDateTime(job.finished_at)} />
            </div>

            {job.error && (
              <div className="mt-6 rounded-sm border border-status-failed/30 bg-status-failed/5 p-4">
                <p className="eyebrow mb-1 text-status-failed">Lỗi lượt đồng bộ</p>
                <p className="text-sm text-status-failed">{job.error}</p>
              </div>
            )}

            {Object.values(job.params).some(Boolean) && (
              <div className="mt-6">
                <p className="eyebrow mb-2">Bộ lọc đã dùng</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(job.params)
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <span
                        key={k}
                        className="rounded-sm border border-paper-line bg-paper px-2 py-1 font-mono text-[12px] text-ink-soft"
                      >
                        {k}={String(v)}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-line p-5">
              <p className="text-sm font-semibold text-ink">Nhật ký vận hành</p>
              <div className="flex gap-2">
                <select
                  className="input w-auto"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <option value="">Tất cả thao tác</option>
                  <option value="API_CALL">API_CALL</option>
                  <option value="DB_INSERT">DB_INSERT</option>
                  <option value="DB_UPDATE">DB_UPDATE</option>
                </select>
                <select
                  className="input w-auto"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="ERROR">ERROR</option>
                </select>
              </div>
            </div>

            {auditLoading ? (
              <EmptyState title="Đang tải nhật ký…" />
            ) : auditError ? (
              <EmptyState tone="error" title="Không tải được nhật ký" description={auditError} />
            ) : filteredEntries.length === 0 ? (
              <EmptyState title="Không có mục nhật ký phù hợp bộ lọc" />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="th">Thời điểm</th>
                        <th className="th">Thao tác</th>
                        <th className="th">Trạng thái</th>
                        <th className="th">HTTP</th>
                        <th className="th">Đối tượng</th>
                        <th className="th">Thời gian xử lý</th>
                        <th className="th">Thông điệp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-paper">
                          <td className="td whitespace-nowrap text-ink-soft/70">
                            {formatDateTime(entry.created_at)}
                          </td>
                          <td className="td font-mono text-[12px] text-ink-soft/80">
                            {entry.action}
                          </td>
                          <td className="td">
                            <StatusBadge status={entry.status} />
                          </td>
                          <td className="td text-ink-soft/70">
                            {entry.http_status ?? "—"}
                          </td>
                          <td className="td max-w-xs truncate text-ink-soft/70">
                            {entry.document_id ?? entry.request_url ?? "—"}
                          </td>
                          <td className="td text-ink-soft/70">
                            {formatDuration(entry.duration_ms)}
                          </td>
                          <td className="td max-w-xs truncate text-ink-soft/70">
                            {entry.error_detail ?? entry.message ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={auditPage}
                  pageSize={AUDIT_PAGE_SIZE}
                  total={auditTotal}
                  onPageChange={setAuditPage}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ fetched, target }: { fetched: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((fetched / target) * 100)) : 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-[12px] text-ink-soft/60">
        <span>Tiến độ thu thập</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-paper-line">
        <div
          className="h-full rounded-full bg-signal transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
