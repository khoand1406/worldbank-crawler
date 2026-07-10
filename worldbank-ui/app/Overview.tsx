"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileStack,
  GitBranch,
  Loader2,
  PlayCircle,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { SyncJob } from "@/lib/types";
import { formatDateTime, formatNumber, sourceTypeLabel } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import StampId from "@/components/StampId";
import EmptyState from "@/components/EmptyState";

interface OverviewStats {
  totalDocuments: number;
  totalSyncJobs: number;
  runningJobs: number;
  failedJobs: number;
  recentJobs: SyncJob[];
}

export default function Overview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      api.listDocuments({ page: 1, page_size: 50 }),
      api.listSyncJobs({page: 1, pageSize: 50}),
    ])
      .then(([docsRes, jobsRes]) => {
        if (cancelled) return;
        const running = jobsRes.data.filter((j) =>
          ["PENDING", "RUNNING"].includes(j.status)
        ).length;
        const failed = jobsRes.data.filter((j) => j.status === "FAILED").length;
        setStats({
          totalDocuments: docsRes.total,
          totalSyncJobs: jobsRes.data.length,
          runningJobs: running,
          failedJobs: failed,
          recentJobs: jobsRes.data.slice(0, 5),
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.log(err)
        setError(
          err instanceof ApiError ? err.message : "Đã xảy ra lỗi không xác định."
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      <div className="mb-8 overflow-hidden rounded-2xl bg-brand-gradient p-8 text-white shadow-lift">
        <p className="eyebrow mb-2 text-white/70">WB-DOC-PIPE-01</p>
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          Registry Console — Tài liệu World Bank
        </h1>
        <p className="mt-2 max-w-2xl text-[13.5px] text-white/80">
          Theo dõi lượt đồng bộ, tra cứu tài liệu đã thu thập và kiểm tra nhật
          ký vận hành pipeline theo thời gian thực.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/documents"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 shadow-sm transition-transform hover:-translate-y-0.5"
          >
            <FileStack size={16} />
            Tra cứu tài liệu
          </Link>
          <Link
            href="/sync-jobs"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
          >
            <GitBranch size={16} />
            Quản lý đồng bộ
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card p-10">
          <EmptyState tone="loading" title="Đang tải số liệu tổng quan…" />
        </div>
      ) : error || !stats ? (
        <div className="card p-10">
          <EmptyState
            tone="error"
            title="Không tải được số liệu tổng quan"
            description={error ?? undefined}
          />
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={FileStack}
              iconClass="bg-brand-50 text-brand-600"
              label="Tổng tài liệu"
              value={formatNumber(stats.totalDocuments)}
            />
            <StatCard
              icon={GitBranch}
              iconClass="bg-accent-soft text-accent"
              label="Tổng lượt đồng bộ"
              value={formatNumber(stats.totalSyncJobs)}
            />
            <StatCard
              icon={Loader2}
              iconClass="bg-status-runningSoft text-status-running"
              label="Đang chờ / đang chạy"
              value={formatNumber(stats.runningJobs)}
              spin={stats.runningJobs > 0}
            />
            <StatCard
              icon={XCircle}
              iconClass="bg-status-failedSoft text-status-failed"
              label="Lượt thất bại (50 gần nhất)"
              value={formatNumber(stats.failedJobs)}
            />
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-surface-line p-5">
              <div className="flex items-center gap-2">
                <PlayCircle size={16} className="text-ink-muted" />
                <p className="font-display text-sm font-bold text-ink">
                  Lượt đồng bộ gần đây
                </p>
              </div>
              <Link
                href="/sync-jobs"
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:text-brand-700"
              >
                Xem tất cả
                <ArrowRight size={13} />
              </Link>
            </div>

            {stats.recentJobs.length === 0 ? (
              <EmptyState
                title="Chưa có lượt đồng bộ nào"
                description="Tạo lượt đồng bộ đầu tiên để bắt đầu thu thập tài liệu."
                action={
                  <Link href="/sync-jobs" className="btn-primary mt-2">
                    Tạo lượt đồng bộ
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="th">Mã lượt</th>
                      <th className="th">Nhóm</th>
                      <th className="th">Trạng thái</th>
                      <th className="th">Đã lấy / mục tiêu</th>
                      <th className="th">Bắt đầu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentJobs.map((job) => (
                      <tr key={job.id} className="transition-colors hover:bg-surface-muted">
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
                          {formatNumber(job.fetched)} / {formatNumber(job.target_limit)}
                        </td>
                        <td className="td text-ink-muted">
                          {formatDateTime(job.started_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconClass,
  label,
  value,
  spin,
}: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string;
  spin?: boolean;
}) {
  return (
    <div className="stat-card">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon size={20} className={spin ? "animate-spin" : ""} />
      </span>
      <div>
        <p className="text-xl font-bold text-ink">{value}</p>
        <p className="text-[12px] text-ink-muted">{label}</p>
      </div>
    </div>
  );
}
