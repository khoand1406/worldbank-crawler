"use client";

import { RefreshCw, SlidersHorizontal, X } from "lucide-react";

export type SyncJobStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type SyncJobSourceType =
  | "PROJECT_DOCUMENTS"
  | "PUBLICATIONS_RESEARCH";

export interface SyncJobsFilterState {
  sourceType: SyncJobSourceType | "";
  status: SyncJobStatus | "";
  pageSize: number;
}

interface SyncJobsFilterBarProps {
  value: SyncJobsFilterState;
  loading?: boolean;
  onChange: (next: SyncJobsFilterState) => void;
  onSubmit: () => void;
  onReset: () => void;
  onRefresh?: () => void;
}

const sourceTypeOptions: Array<{
  value: SyncJobSourceType;
  label: string;
}> = [
  {
    value: "PROJECT_DOCUMENTS",
    label: "Project Documents",
  },
  {
    value: "PUBLICATIONS_RESEARCH",
    label: "Publications & Research",
  },
];

const statusOptions: Array<{
  value: SyncJobStatus;
  label: string;
}> = [
  {
    value: "PENDING",
    label: "Chờ chạy",
  },
  {
    value: "RUNNING",
    label: "Đang chạy",
  },
  {
    value: "COMPLETED",
    label: "Hoàn thành",
  },
  {
    value: "FAILED",
    label: "Thất bại",
  },
  {
    value: "CANCELLED",
    label: "Đã hủy",
  },
];

const pageSizeOptions = [10, 20, 50, 100];

export default function SyncJobsFilterBar({
  value,
  loading = false,
  onChange,
  onSubmit,
  onReset,
  onRefresh,
}: SyncJobsFilterBarProps) {
  function set<K extends keyof SyncJobsFilterState>(
    key: K,
    nextValue: SyncJobsFilterState[K],
  ) {
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  return (
    <form
      className="card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="mb-4 flex items-center gap-2 text-ink-muted">
        <SlidersHorizontal size={15} />
        <span className="eyebrow text-ink-muted">Bộ lọc</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <div>
          <label className="eyebrow mb-1.5 block">Nhóm dữ liệu</label>
          <select
            className="input"
            value={value.sourceType}
            onChange={(e) =>
              set(
                "sourceType",
                e.target.value as SyncJobsFilterState["sourceType"],
              )
            }
          >
            <option value="">Tất cả nhóm</option>
            {sourceTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Trạng thái</label>
          <select
            className="input"
            value={value.status}
            onChange={(e) =>
              set("status", e.target.value as SyncJobsFilterState["status"])
            }
          >
            <option value="">Tất cả trạng thái</option>
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Số dòng / trang</label>
          <select
            className="input"
            value={value.pageSize}
            onChange={(e) => set("pageSize", Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} dòng
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            disabled={loading}
            onClick={onRefresh}
            className="btn-secondary w-full"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Làm mới
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 border-t border-surface-line pt-5 sm:flex-row">
        <button type="submit" disabled={loading} className="btn-primary">
          <SlidersHorizontal size={15} />
          Áp dụng bộ lọc
        </button>

        <button
          type="button"
          disabled={loading}
          className="btn-secondary"
          onClick={onReset}
        >
          <X size={15} />
          Xoá bộ lọc
        </button>
      </div>
    </form>
  );
}