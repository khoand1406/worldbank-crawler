"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { SyncJob } from "@/lib/types";
import { formatDateTime, formatNumber, sourceTypeLabel } from "@/lib/format";
import CreateSyncJobForm from "@/components/CreateSyncJobForm";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import {
  useSyncJobEvents,
  type SyncJobProgressEvent,
  type SyncJobUpdatedEvent,
} from "@/hooks/useSyncJobEvents";

import { toast, Toaster } from "sonner";
import SyncJobsFilterBar, {
  SyncJobsFilterState,
} from "@/components/SyncJobFilterBar";

const defaultFilters: SyncJobsFilterState = {
  sourceType: "",
  status: "",
  pageSize: 20,
};

export default function SyncJobsExplorer() {
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionJobId, setActionJobId] = useState<string | null>(null);
  const [filters, setFilters] = useState<SyncJobsFilterState>(defaultFilters);
  const totalPage = Math.max(1, Math.ceil(total / filters.pageSize));
  const load = useCallback(
    (override?: { page?: number; filters?: SyncJobsFilterState }) => {
      const nextPage = override?.page ?? page;
      const nextFilters = override?.filters ?? filters;

      setLoading(true);
      setError(null);

      api
        .listSyncJobs({
          page: nextPage,
          pageSize: nextFilters.pageSize,
          sourceType: nextFilters.sourceType,
          status: nextFilters.status,
        })
        .then((res) => {
          setJobs(res.data);
          setTotal(res.total);
        })
        .catch((err: unknown) => {
          setJobs([]);
          setTotal(0);
          setError(
            err instanceof ApiError
              ? err.message
              : "Đã xảy ra lỗi không xác định.",
          );
        })
        .finally(() => setLoading(false));
    },
    [page, filters],
  );
  useEffect(() => {
    load();
  }, [load]);

  const patchJobInList = useCallback(
    (jobId: string, patch: Partial<SyncJob>) => {
      setJobs((currentJobs) =>
        currentJobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                ...patch,
              }
            : job,
        ),
      );
    },
    [],
  );
  function handleFilterChange(next: SyncJobsFilterState) {
    setFilters(next);
    setPage(1);
  }
  function handleApplyFilters() {
    setPage(1);
    load({ page: 1 });
  }

  function getJobProgress(job: SyncJob) {
    const inserted = Number(job.inserted ?? 0);
    const updated = Number(job.updated ?? 0);
    const failed = Number(job.failed_count ?? 0);
    const targetLimit = Number(job.target_limit ?? 0);
    const totalAvailable = Number(job.total_available ?? 0);

    const processed = inserted + updated + failed;
    const succeeded = inserted + updated;

    const denominator = targetLimit > 0 ? targetLimit : totalAvailable;

    if (denominator <= 0) {
      return {
        processed,
        succeeded,
        failed,
        total: 0,
        percent: 0,
        successPercent: 0,
      };
    }

    return {
      processed,
      succeeded,
      failed,
      total: denominator,
      percent: Math.min(100, Math.round((processed / denominator) * 100)),
      successPercent: Math.min(
        100,
        Math.round((succeeded / denominator) * 100),
      ),
    };
  }
  function JobProgressBar({ job }: { job: SyncJob }) {
    const progress = getJobProgress(job);

    return (
      <div className="min-w-[170px]">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-ink-muted">
            {formatNumber(progress.processed)} / {formatNumber(progress.total)}
          </span>

          <span className="font-semibold text-brand-700">
            {progress.percent}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-500"
            style={{ width: `${progress.percent}%` }}
          />
        </div>

        <div className="mt-1 text-[11px] text-ink-muted">
          Thành công {formatNumber(progress.succeeded)}
          {progress.failed > 0 && (
            <span className="text-status-failed">
              {" "}
              · Lỗi {formatNumber(progress.failed)}
            </span>
          )}
        </div>
      </div>
    );
  }

  function handleResetFilters() {
    setFilters(defaultFilters);
    setPage(1);
    load({
      page: 1,
      filters: defaultFilters,
    });
  }

  const handleJobUpdated = useCallback(
    (event: SyncJobUpdatedEvent) => {
      patchJobInList(String(event.id), {
        status: event.status,
      } as Partial<SyncJob>);

      if (event.status === "COMPLETED") {
        toast.success(`Job #${event.id} đã hoàn tất`);
        load();
      }

      if (event.status === "FAILED") {
        toast.error(event.message || `Job #${event.id} thất bại`);
        load();
      }
    },
    [patchJobInList, load],
  );

  const handleJobProgress = useCallback(
    (event: SyncJobProgressEvent) => {
      patchJobInList(String(event.id), {
        status: event.status,
        fetched: event.fetched,
        inserted: event.inserted,
        updated: event.updated,
        failed_count: event.failed,
      } as Partial<SyncJob>);
    },
    [patchJobInList],
  );

  const handleRunJob = useCallback(
    async (jobId: number) => {
      try {
        setActionJobId(String(jobId));

        await api.runSyncJob(jobId);

        patchJobInList(String(jobId), {
          status: "RUNNING",
        } as Partial<SyncJob>);

        toast.success(`Đã bắt đầu Job #${jobId}`);
        load();
      } catch (err: unknown) {
        toast.error(
          err instanceof ApiError ? err.message : "Không thể chạy job.",
        );
      } finally {
        setActionJobId(null);
      }
    },
    [patchJobInList, load],
  );

  const handleCancelJob = useCallback(
    async (jobId: number) => {
      try {
        setActionJobId(String(jobId));

        await api.cancelSyncJob(jobId);

        toast.success(`Đã yêu cầu hủy Job #${jobId}`);
        load();
      } catch (err: unknown) {
        toast.error(
          err instanceof ApiError ? err.message : "Không thể hủy job.",
        );
      } finally {
        setActionJobId(null);
      }
    },
    [load],
  );

  useSyncJobEvents({
    onJobUpdated: handleJobUpdated,
    onJobProgress: handleJobProgress,
  });

  return (
    <div className="space-y-5">
      <CreateSyncJobForm
        onCreated={() => {
          setFilters(defaultFilters);
          setPage(1);
          load({
            page: 1,
            filters: defaultFilters,
          });
        }}
      />
      <SyncJobsFilterBar
        value={filters}
        loading={loading}
        onChange={handleFilterChange}
        onSubmit={handleApplyFilters}
        onReset={handleResetFilters}
        onRefresh={load}
      />

      <div className="card overflow-hidden">
        {loading ? (
          <EmptyState tone="loading" title="Đang tải danh sách lượt đồng bộ…" />
        ) : error ? (
          <EmptyState
            tone="error"
            title="Không tải được dữ liệu"
            description={error}
          />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="Chưa có lượt đồng bộ nào"
            description="Tạo lượt đồng bộ đầu tiên để bắt đầu thu thập tài liệu từ World Bank Documents API."
          />
        ) : (
          <>
            {/* Mobile card list */}
            <div className="space-y-3 p-3 md:hidden">
              {jobs.map((job) => {
                const status = job.status?.toUpperCase();
                const isActionLoading = actionJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className="rounded-xl border border-surface-line bg-surface p-4 shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/sync-jobs/${encodeURIComponent(job.id)}`}
                          className="text-sm font-semibold text-ink hover:text-brand-600 hover:underline"
                        >
                          {sourceTypeLabel(job.source_type)}
                        </Link>

                        <div className="mt-2 space-y-2">
                          <StatusBadge status={job.status} />

                          {status === "RUNNING" && <JobProgressBar job={job} />}
                        </div>
                      </div>

                      <div>
                        {status === "PENDING" ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleRunJob(Number.parseInt(job.id))
                            }
                            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isActionLoading ? "Đang chạy…" : "Run"}
                          </button>
                        ) : status === "RUNNING" ? (
                          <button
                            type="button"
                            disabled={isActionLoading}
                            onClick={() =>
                              handleCancelJob(Number.parseInt(job.id))
                            }
                            className="inline-flex items-center justify-center rounded-lg border border-status-failed px-3 py-1.5 text-xs font-semibold text-status-failed transition hover:bg-status-failed-soft disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isActionLoading ? "Đang hủy…" : "Cancel"}
                          </button>
                        ) : (
                          <span className="text-xs text-ink-muted">—</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-status-success-soft px-2 py-1.5 text-status-success">
                        <p className="text-[10px] font-semibold uppercase">
                          Thêm mới
                        </p>
                        <p className="mt-0.5 font-semibold">
                          {formatNumber(job.inserted)}
                        </p>
                      </div>

                      <div className="rounded-lg bg-brand-50 px-2 py-1.5 text-brand-700">
                        <p className="text-[10px] font-semibold uppercase">
                          Cập nhật
                        </p>
                        <p className="mt-0.5 font-semibold">
                          {formatNumber(job.updated)}
                        </p>
                      </div>

                      <div
                        className={
                          job.failed_count > 0
                            ? "rounded-lg bg-status-failed-soft px-2 py-1.5 text-status-failed"
                            : "rounded-lg bg-surface-muted px-2 py-1.5 text-ink-muted"
                        }
                      >
                        <p className="text-[10px] font-semibold uppercase">
                          Lỗi
                        </p>
                        <p className="mt-0.5 font-semibold">
                          {formatNumber(job.failed_count)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-1 border-t border-surface-line pt-3 text-xs text-ink-muted">
                      <div className="flex justify-between gap-3">
                        <span>Bắt đầu</span>
                        <span className="text-right">
                          {formatDateTime(job.started_at)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span>Kết thúc</span>
                        <span className="text-right">
                          {formatDateTime(job.finished_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] border-collapse">
                <thead className="bg-surface-muted/70">
                  <tr>
                    <th className="th min-w-[180px]">Nhóm dữ liệu</th>
                    <th className="th w-[140px]">Trạng thái</th>
                    <th className="th min-w-[190px]">Tiến độ</th>
                    <th className="th min-w-[190px]">Kết quả ghi dữ liệu</th>
                    <th className="th min-w-[150px]">Bắt đầu</th>
                    <th className="th w-[120px] text-right">Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {jobs.map((job) => {
                    const status = job.status?.toUpperCase();
                    const isActionLoading = actionJobId === job.id;

                    return (
                      <tr
                        key={job.id}
                        className="transition-colors hover:bg-surface-muted/60"
                      >
                        <td className="td">
                          <Link
                            href={`/sync-jobs/${encodeURIComponent(job.id)}`}
                            className="font-medium text-ink hover:text-brand-600 hover:underline"
                          >
                            {sourceTypeLabel(job.source_type)}
                          </Link>
                        </td>

                        <td className="td">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="td">
                          {status === "RUNNING" ? (
                            <JobProgressBar job={job} />
                          ) : (
                            <span className="text-sm text-ink-muted">
                              {formatNumber(
                                Number(job.inserted ?? 0) +
                                  Number(job.updated ?? 0) +
                                  Number(job.failed_count ?? 0),
                              )}{" "}
                              đã xử lý
                            </span>
                          )}
                        </td>

                        <td className="td">
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <span className="rounded-full bg-status-success-soft px-2 py-0.5 font-medium text-status-success">
                              +{formatNumber(job.inserted)}
                            </span>

                            <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                              ↻ {formatNumber(job.updated)}
                            </span>

                            <span
                              className={
                                job.failed_count > 0
                                  ? "rounded-full bg-status-failed-soft px-2 py-0.5 font-medium text-status-failed"
                                  : "rounded-full bg-surface-muted px-2 py-0.5 font-medium text-ink-muted"
                              }
                            >
                              ! {formatNumber(job.failed_count)}
                            </span>
                          </div>
                        </td>

                        <td className="td whitespace-nowrap text-ink-muted">
                          {formatDateTime(job.started_at)}
                        </td>
                        
                        <td className="td">
                          <div className="flex justify-end">
                            {status === "PENDING" ? (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() =>
                                  handleRunJob(Number.parseInt(job.id))
                                }
                                className="inline-flex min-w-20 items-center justify-center rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isActionLoading ? "Đang chạy…" : "Run"}
                              </button>
                            ) : status === "RUNNING" ? (
                              <button
                                type="button"
                                disabled={isActionLoading}
                                onClick={() =>
                                  handleCancelJob(Number.parseInt(job.id))
                                }
                                className="inline-flex min-w-20 items-center justify-center rounded-lg border border-status-failed px-3 py-1.5 text-sm font-semibold text-status-failed transition hover:bg-status-failed-soft disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isActionLoading ? "Đang hủy…" : "Cancel"}
                              </button>
                            ) : (
                              <span className="text-sm text-ink-muted">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="flex flex-col gap-3 border-t border-surface-line px-4 py-3 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
                <div>
                  Trang {page} / {totalPage} · Tổng {formatNumber(total)} lượt
                  đồng bộ
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    className="rounded-lg border border-surface-line px-3 py-1.5 font-medium transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Trước
                  </button>

                  <button
                    type="button"
                    disabled={page >= totalPage || loading}
                    onClick={() =>
                      setPage((current) => Math.min(totalPage, current + 1))
                    }
                    className="rounded-lg border border-surface-line px-3 py-1.5 font-medium transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <Toaster position="bottom-right" duration={2000}></Toaster>
    </div>
  );
}
