"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  FileDown,
  GitBranch,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { api, ApiError } from "@/lib/api";
import type { AuditLogEntry, SyncJob } from "@/lib/types";
import {
  formatDateTime,
  formatNumber,
  sourceTypeLabel,
} from "@/lib/format";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";
import StampId from "@/components/StampId";
import Pagination from "@/components/Pagination";

const AUDIT_PAGE_SIZE = 50;

export default function SyncJobDetailPage() {
  const params = useParams<{ id: string }>();

  const [job, setJob] = useState<SyncJob | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadJob() {
    setLoading(true);
    setError(null);

    api
      .getSyncJob(params.id)
      .then(setJob)
      .catch((err: unknown) => {
        setJob(null);
        setError(
          err instanceof ApiError ? err.message : "Đã xảy ra lỗi không xác định."
        );
      })
      .finally(() => setLoading(false));
  }

  function loadAudit() {
    setAuditLoading(true);

    api
      .getSyncJobAudit(params.id, auditPage, AUDIT_PAGE_SIZE)
      .then((res) => {
        setAuditLogs(res.data);
        setAuditTotal(res.total);
      })
      .catch(() => {
        setAuditLogs([]);
        setAuditTotal(0);
      })
      .finally(() => setAuditLoading(false));
  }

  useEffect(() => {
    loadJob();
  }, [params.id]);

  useEffect(() => {
    loadAudit();
  }, [params.id, auditPage]);

  const progress = useMemo(() => {
    if (!job) return 0;

    const base =
      job.total_available && job.total_available > 0
        ? Math.min(job.total_available, job.target_limit)
        : job.target_limit;

    if (!base || base <= 0) return 0;

    return Math.min(100, Math.round((job.fetched / base) * 100));
  }, [job]);

  const durationText = useMemo(() => {
    if (!job?.started_at) return "—";

    const start = new Date(job.started_at).getTime();
    const end = job.finished_at
      ? new Date(job.finished_at).getTime()
      : Date.now();

    if (Number.isNaN(start) || Number.isNaN(end)) return "—";

    const seconds = Math.max(0, Math.round((end - start) / 1000));

    if (seconds < 60) return `${seconds}s`;

    const minutes = Math.floor(seconds / 60);
    const restSeconds = seconds % 60;

    if (minutes < 60) return `${minutes}m ${restSeconds}s`;

    const hours = Math.floor(minutes / 60);
    const restMinutes = minutes % 60;

    return `${hours}h ${restMinutes}m`;
  }, [job]);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/sync-jobs"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft size={14} />
          Quay lại danh sách đồng bộ
        </Link>

        <button
          type="button"
          onClick={() => {
            loadJob();
            loadAudit();
          }}
          className="btn-secondary"
        >
          <RefreshCw size={15} />
          Tải lại
        </button>
      </div>

      {loading ? (
        <div className="card p-10">
          <EmptyState tone="loading" title="Đang tải chi tiết lượt đồng bộ…" />
        </div>
      ) : error || !job ? (
        <div className="card p-10">
          <EmptyState
            tone="error"
            title="Không tải được lượt đồng bộ"
            description={error ?? "Không tìm thấy lượt đồng bộ."}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="bg-brand-gradient-soft px-6 py-5">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <StampId value={job.id} />
                <StatusBadge status={job.status} />
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-600 shadow-sm">
                  {sourceTypeLabel(job.source_type)}
                </span>
              </div>

              <h1 className="font-display text-xl font-bold text-ink">
                Lượt đồng bộ #{job.id}
              </h1>

              <p className="mt-1.5 text-[13.5px] text-ink-muted">
                Theo dõi tiến độ thu thập, số bản ghi đã xử lý và nhật ký vận
                hành từ World Bank Documents API.
              </p>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="eyebrow mb-1">Tiến độ thu thập</p>
                    <p className="text-sm text-ink-muted">
                      {formatNumber(job.fetched)} đã lấy /{" "}
                      {formatNumber(
                        job.total_available && job.total_available > 0
                          ? Math.min(job.total_available, job.target_limit)
                          : job.target_limit
                      )}{" "}
                      mục tiêu xử lý
                    </p>
                  </div>

                  <p className="font-display text-2xl font-bold text-ink">
                    {progress}%
                  </p>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-brand-gradient transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  icon={FileDown}
                  label="Đã lấy"
                  value={formatNumber(job.fetched)}
                  hint={`Target: ${formatNumber(job.target_limit)}`}
                />

                <MetricCard
                  icon={CheckCircle2}
                  label="Thêm mới"
                  value={formatNumber(job.inserted)}
                  tone="success"
                />

                <MetricCard
                  icon={Database}
                  label="Cập nhật"
                  value={formatNumber(job.updated)}
                />

                <MetricCard
                  icon={XCircle}
                  label="Lỗi xử lý"
                  value={formatNumber(job.failed_count)}
                  tone={job.failed_count > 0 ? "danger" : "default"}
                />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-5 border-t border-surface-line pt-6 md:grid-cols-3">
                <InfoField label="Tổng có sẵn">
                  {job.total_available !== null
                    ? formatNumber(job.total_available)
                    : "—"}
                </InfoField>

                <InfoField label="Offset hiện tại">
                  {formatNumber(job.current_offset)}
                </InfoField>

                <InfoField label="Thời gian chạy">{durationText}</InfoField>

                <InfoField label="Bắt đầu">
                  {formatDateTime(job.started_at)}
                </InfoField>

                <InfoField label="Kết thúc">
                  {formatDateTime(job.finished_at)}
                </InfoField>

                <InfoField label="Cập nhật lần cuối">
                  {formatDateTime(job.updated_at)}
                </InfoField>
              </div>

              {job.error && (
                <div className="mt-6 rounded-2xl border border-status-failed/20 bg-status-failedSoft p-4">
                  <div className="mb-2 flex items-center gap-2 text-status-failed">
                    <AlertTriangle size={16} />
                    <p className="text-sm font-semibold">Lỗi đồng bộ</p>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-6 text-status-failed">
                    {job.error}
                  </p>
                </div>
              )}

              <div className="mt-6 rounded-2xl border border-surface-line bg-surface-muted p-4">
                <p className="eyebrow mb-2">Tham số đồng bộ</p>
                <pre className="overflow-x-auto rounded-xl bg-white p-4 font-mono text-[12px] leading-5 text-ink-muted">
                  {JSON.stringify(job.params, null, 2)}
                </pre>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-line p-5">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-ink-muted" />
                <div>
                  <p className="font-display text-sm font-bold text-ink">
                    Nhật ký vận hành
                  </p>
                  <p className="text-[12px] text-ink-muted">
                    API call, xử lý batch và lỗi phát sinh trong quá trình đồng bộ.
                  </p>
                </div>
              </div>

              {auditLoading && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-muted">
                  <Loader2 size={13} className="animate-spin" />
                  Đang tải log…
                </span>
              )}
            </div>

            {auditLoading ? (
              <EmptyState tone="loading" title="Đang tải audit log…" />
            ) : auditLogs.length === 0 ? (
              <EmptyState
                title="Chưa có audit log"
                description="Lượt đồng bộ này chưa ghi nhận nhật ký vận hành."
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="th">Thời điểm</th>
                        <th className="th">Action</th>
                        <th className="th">Status</th>
                        <th className="th">HTTP</th>
                        <th className="th">Message</th>
                        <th className="th">Duration</th>
                        <th className="th">Request</th>
                      </tr>
                    </thead>

                    <tbody>
                      {auditLogs.map((log) => (
                        <tr
                          key={log.id}
                          className="transition-colors hover:bg-surface-muted"
                        >
                          <td className="td whitespace-nowrap text-ink-muted">
                            {formatDateTime(log.created_at)}
                          </td>

                          <td className="td">
                            <AuditActionBadge action={log.action} />
                          </td>

                          <td className="td">
                            <AuditStatusBadge status={log.status} />
                          </td>

                          <td className="td text-ink-muted">
                            {log.http_status ?? "—"}
                          </td>

                          <td className="td min-w-[260px]">
                            <div>
                              <p className="text-sm text-ink">
                                {log.message ?? "—"}
                              </p>

                              {log.error_detail && (
                                <p className="mt-1 max-w-xl break-words text-[12px] leading-5 text-status-failed">
                                  {log.error_detail}
                                </p>
                              )}

                              {log.document_id && (
                                <p className="mt-1 font-mono text-[11px] text-ink-muted">
                                  doc_id: {log.document_id}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="td whitespace-nowrap text-ink-muted">
                            {log.duration_ms !== null
                              ? `${formatNumber(log.duration_ms)}ms`
                              : "—"}
                          </td>

                          <td className="td max-w-xs">
                            {log.request_url ? (
                              <a
                                href={log.request_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex max-w-xs items-center gap-1 truncate text-[13px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
                                title={log.request_url}
                              >
                                <span className="truncate">Mở URL</span>
                                <ExternalLink size={12} />
                              </a>
                            ) : (
                              <span className="text-ink-muted/50">—</span>
                            )}
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

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "bg-status-completedSoft text-status-completed"
      : tone === "danger"
        ? "bg-status-failedSoft text-status-failed"
        : "bg-brand-50 text-brand-600";

  return (
    <div className="rounded-2xl border border-surface-line bg-surface p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}
        >
          <Icon size={18} />
        </span>
      </div>

      <p className="font-display text-2xl font-bold text-ink">{value}</p>
      <p className="text-[12px] text-ink-muted">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-ink-muted/70">{hint}</p>}
    </div>
  );
}

function InfoField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="text-sm text-ink">{children}</p>
    </div>
  );
}

function AuditActionBadge({ action }: { action: string }) {
  const className =
    action === "API_CALL"
      ? "bg-brand-50 text-brand-600"
      : action === "DB_BATCH"
        ? "bg-accent-soft text-accent"
        : "bg-surface-muted text-ink-muted";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
    >
      {action}
    </span>
  );
}

function AuditStatusBadge({ status }: { status: string }) {
  const className =
    status === "SUCCESS"
      ? "bg-status-completedSoft text-status-completed"
      : "bg-status-failedSoft text-status-failed";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}
    >
      {status}
    </span>
  );
}