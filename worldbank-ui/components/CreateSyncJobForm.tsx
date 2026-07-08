"use client";

import { useState } from "react";
import { Plus, Play, X } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type { CreateSyncJobPayload, SourceType } from "@/lib/types";

const MAX_TARGET_LIMIT = 10000;
const DEFAULT_TARGET_LIMIT = 1000;

interface CreateSyncJobFormProps {
  onCreated: () => void;
}

export default function CreateSyncJobForm({ onCreated }: CreateSyncJobFormProps) {
  const [open, setOpen] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>("PROJECT_DOCUMENTS");
  const [targetLimit, setTargetLimit] = useState(DEFAULT_TARGET_LIMIT);
  const [qterm, setQterm] = useState("");
  const [countExact, setCountExact] = useState("");
  const [strdate, setStrdate] = useState("");
  const [enddate, setEnddate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: CreateSyncJobPayload = {
      source_type: sourceType,
      target_limit: Math.min(Math.max(targetLimit, 1), MAX_TARGET_LIMIT),
      params: {
        qterm: qterm || undefined,
        count_exact: countExact || undefined,
        strdate: strdate || undefined,
        enddate: enddate || undefined,
      },
    };

    try {
      await api.createSyncJob(payload);
      setOpen(false);
      setQterm("");
      setCountExact("");
      setStrdate("");
      setEnddate("");
      setTargetLimit(DEFAULT_TARGET_LIMIT);
      onCreated();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Không tạo được lượt đồng bộ."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        <Plus size={16} />
        Tạo lượt đồng bộ
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-ink">Lượt đồng bộ mới</p>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          onClick={() => setOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="eyebrow mb-1.5 block">Nhóm dữ liệu</label>
          <select
            className="input"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as SourceType)}
          >
            <option value="A">Nhóm A — Project Documents</option>
            <option value="B">Nhóm B — Publications & Research</option>
          </select>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">
            Số bản ghi mục tiêu (tối đa {MAX_TARGET_LIMIT.toLocaleString("vi-VN")})
          </label>
          <input
            type="number"
            min={1}
            max={MAX_TARGET_LIMIT}
            className="input"
            value={targetLimit}
            onChange={(e) => setTargetLimit(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Từ khoá (qterm)</label>
          <input
            className="input"
            placeholder="tuỳ chọn"
            value={qterm}
            onChange={(e) => setQterm(e.target.value)}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Mã quốc gia (count_exact)</label>
          <input
            className="input"
            placeholder="tuỳ chọn, vd: VN"
            value={countExact}
            onChange={(e) => setCountExact(e.target.value)}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Từ ngày (strdate)</label>
          <input
            type="date"
            className="input"
            value={strdate}
            onChange={(e) => setStrdate(e.target.value)}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Đến ngày (enddate)</label>
          <input
            type="date"
            className="input"
            value={enddate}
            onChange={(e) => setEnddate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-status-failedSoft px-3 py-2 text-[13px] text-status-failed">
          {error}
        </p>
      )}

      <div className="flex gap-2 border-t border-surface-line pt-4">
        <button type="submit" className="btn-primary" disabled={submitting}>
          <Play size={15} />
          {submitting ? "Đang tạo…" : "Chạy đồng bộ"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setOpen(false)}
          disabled={submitting}
        >
          Huỷ
        </button>
      </div>
    </form>
  );
}
