"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { SyncJob } from "@/lib/types";
import { formatDateTime, formatNumber, sourceTypeLabel } from "@/lib/format";
import CreateSyncJobForm from "@/components/CreateSyncJobForm";
import StatusBadge from "@/components/StatusBadge";
import StampId from "@/components/StampId";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import {
  useSyncJobEvents,
  type SyncJobProgressEvent,
  type SyncJobUpdatedEvent,
} from "@/hooks/useSyncJobEvents";

import { toast, Toaster } from "sonner";

const PAGE_SIZE = 20;

export default function SyncJobsExplorer() {
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionJobId, setActionJobId] = useState<string | null>(null);
  const load = useCallback(() => {
    setLoading(true);
    setError(null);

    api
      .listSyncJobs(page, PAGE_SIZE)
      .then((res) => {
        setJobs(res.data);
        setTotal(res.data.length);
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
  }, [page]);

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
          setPage(1);
          load();
        }}
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
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="th">Mã lượt</th>
                    <th className="th">Nhóm</th>
                    <th className="th">Trạng thái</th>
                    <th className="th">Tiến độ</th>
                    <th className="th">Thêm mới / Cập nhật / Lỗi</th>
                    <th className="th">Bắt đầu</th>
                    <th className="th">Hành Động</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="transition-colors hover:bg-surface-muted"
                    >
                      <td className="td">
                        <Link href={`/sync-jobs/${encodeURIComponent(job.id)}`}>
                          <StampId value={job.id} />
                        </Link>
                      </td>
                      <td className="td text-ink-muted">
                        {sourceTypeLabel(job.source_type)}
                      </td>
                      <td className="td">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="td text-ink-muted">
                        {formatNumber(job.fetched)} /{" "}
                        {formatNumber(job.target_limit)}
                      </td>
                      <td className="td text-ink-muted">
                        {formatNumber(job.inserted)} /{" "}
                        {formatNumber(job.updated)} /{" "}
                        <span
                          className={
                            job.failed_count > 0
                              ? "font-medium text-status-failed"
                              : ""
                          }
                        >
                          {formatNumber(job.failed_count)}
                        </span>
                      </td>
                      <td className="td text-ink-muted">
                        {formatDateTime(job.started_at)}
                      </td>
                      <td className="td">
                        {job.status === "PENDING" ? (
                          <button
                            type="button"
                            disabled={actionJobId === job.id}
                            onClick={() => handleRunJob(Number.parseInt(job.id))}
                            className="rounded-sm bg-signal px-3 py-1.5 text-sm font-semibold text-black shadow-sm transition hover:bg-signal/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionJobId === job.id ? "Đang chạy…" : "Run"}
                          </button>
                        ) : job.status === "RUNNING" ? (
                          <button
                            type="button"
                            disabled={actionJobId === job.id}
                            onClick={() => handleCancelJob(Number.parseInt(job.id))}
                            className="rounded-lg border border-status-failed px-3 py-1.5 text-sm font-medium text-status-failed transition hover:bg-status-failed/10 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {actionJobId === job.id ? "Đang hủy…" : "Cancel"}
                          </button>
                        ) : (
                          <span className="text-sm text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
      <Toaster position="bottom-right" duration={2000}></Toaster>
    </div>
  );
}
