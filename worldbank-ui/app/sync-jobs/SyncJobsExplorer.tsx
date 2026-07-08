"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { SyncJob } from "@/lib/types";
import { formatDateTime, formatNumber, sourceTypeLabel } from "@/lib/format";
import CreateSyncJobForm from "@/components/CreateSyncJobForm";
import StampId from "@/components/StampId";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import StatusBadge from "@/components/StatusBadge";

const PAGE_SIZE = 20;

export default function SyncJobsExplorer() {
  const [page, setPage] = useState(1);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .listSyncJobs(page, PAGE_SIZE)
      .then((res) => {
        setJobs(res.data);
        setTotal(res.total);
      })
      .catch((err: unknown) => {
        setJobs([]);
        setTotal(0);
        setError(
          err instanceof ApiError ? err.message : "Đã xảy ra lỗi không xác định."
        );
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

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
          <EmptyState title="Đang tải danh sách lượt đồng bộ…" />
        ) : error ? (
          <EmptyState tone="error" title="Không tải được dữ liệu" description={error} />
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
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-paper">
                      <td className="td">
                        <Link href={`/sync-jobs/${encodeURIComponent(job.id)}`}>
                          <StampId value={job.id} />
                        </Link>
                      </td>
                      <td className="td text-ink-soft/80">
                        {sourceTypeLabel(job.source_type)}
                      </td>
                      <td className="td">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="td text-ink-soft/80">
                        {formatNumber(job.fetched)} / {formatNumber(job.target_limit)}
                      </td>
                      <td className="td text-ink-soft/80">
                        {formatNumber(job.inserted)} / {formatNumber(job.updated)} /{" "}
                        <span className={job.failed_count > 0 ? "text-status-failed" : ""}>
                          {formatNumber(job.failed_count)}
                        </span>
                      </td>
                      <td className="td text-ink-soft/80">
                        {formatDateTime(job.started_at)}
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
    </div>
  );
}
