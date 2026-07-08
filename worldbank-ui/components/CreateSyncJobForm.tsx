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
  const [autoStart, setAutoStart] = useState(true);

  const [qterm, setQterm] = useState("");
  const [countryKey, setCountryKey] = useState("");
  const [language, setLanguage] = useState("");
  const [majorDocType, setMajorDocType] = useState("");
  const [docType, setDocType] = useState("");
  const [strdate, setStrdate] = useState("");
  const [enddate, setEnddate] = useState("");
  const [sort, setSort] = useState("last_modified_date");
  const [order, setOrder] = useState("desc");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setQterm("");
    setCountryKey("");
    setLanguage("");
    setMajorDocType("");
    setDocType("");
    setStrdate("");
    setEnddate("");
    setSort("last_modified_date");
    setOrder("desc");
    setTargetLimit(DEFAULT_TARGET_LIMIT);
    setAutoStart(true);
    setSourceType("PROJECT_DOCUMENTS");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setError(null);

    const safeTargetLimit = Math.min(
      Math.max(Number(targetLimit) || DEFAULT_TARGET_LIMIT, 1),
      MAX_TARGET_LIMIT
    );

    const payload: CreateSyncJobPayload = {
      source_type: sourceType,
      target_limit: safeTargetLimit,
      auto_start: autoStart,
      params: {
        qterm: qterm || undefined,

        strdate: strdate || undefined,
        enddate: enddate || undefined,

        country_key: countryKey || undefined,
        language: language || undefined,

        major_doc_type: majorDocType || undefined,
        doc_type: docType || undefined,

        sort: sort || undefined,
        order: order || undefined,
      },
    };

    try {
      await api.createSyncJob(payload);
      setOpen(false);
      resetForm();
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
        <div>
          <p className="font-display text-sm font-bold text-ink">
            Lượt đồng bộ mới
          </p>
          <p className="mt-1 text-[12px] text-ink-muted">
            Tạo job thu thập tài liệu từ World Bank Documents API.
          </p>
        </div>

        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          onClick={() => setOpen(false)}
          disabled={submitting}
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
            disabled={submitting}
          >
            <option value="PROJECT_DOCUMENTS">Project Documents</option>
            <option value="PUBLICATIONS_RESEARCH">
              Publications & Research
            </option>
          </select>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">
            Số bản ghi mục tiêu tối đa {MAX_TARGET_LIMIT.toLocaleString("vi-VN")}
          </label>
          <input
            type="number"
            min={1}
            max={MAX_TARGET_LIMIT}
            className="input"
            value={targetLimit}
            onChange={(e) => setTargetLimit(Number(e.target.value))}
            disabled={submitting}
          />
        </div>

        <div className="md:col-span-2">
          <label className="eyebrow mb-1.5 block">Từ khoá tìm kiếm</label>
          <input
            className="input"
            placeholder="vd: climate resilience, energy access"
            value={qterm}
            onChange={(e) => setQterm(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Mã quốc gia</label>
          <input
            className="input"
            placeholder="vd: vietnam, burundi, world"
            value={countryKey}
            onChange={(e) => setCountryKey(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Ngôn ngữ</label>
          <input
            className="input"
            placeholder="vd: English, French, Spanish"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Nhóm tài liệu lớn</label>
          <select
            className="input"
            value={majorDocType}
            onChange={(e) => setMajorDocType(e.target.value)}
            disabled={submitting}
          >
            <option value="">Tự động theo nhóm dữ liệu</option>
            <option value="Project Documents">Project Documents</option>
            <option value="Publications & Research">
              Publications & Research
            </option>
          </select>
          <p className="mt-1 text-[11px] text-ink-muted">
            Có thể để trống để backend tự xử lý theo source_type.
          </p>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Loại tài liệu</label>
          <input
            className="input"
            placeholder="vd: Report, Brief, Working Paper, ESMAP Paper"
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Từ ngày</label>
          <input
            type="date"
            className="input"
            value={strdate}
            onChange={(e) => setStrdate(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Đến ngày</label>
          <input
            type="date"
            className="input"
            value={enddate}
            onChange={(e) => setEnddate(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Sắp xếp theo</label>
          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            disabled={submitting}
          >
            <option value="last_modified_date">Ngày cập nhật mới nhất</option>
            <option value="docdt">Ngày tài liệu</option>
            <option value="disclosure_date">Ngày công bố</option>
          </select>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Thứ tự</label>
          <select
            className="input"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            disabled={submitting}
          >
            <option value="desc">Giảm dần</option>
            <option value="asc">Tăng dần</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 rounded-xl border border-surface-line bg-surface-muted px-3 py-2.5 text-sm text-ink">
        <input
          type="checkbox"
          checked={autoStart}
          onChange={(e) => setAutoStart(e.target.checked)}
          disabled={submitting}
          className="h-4 w-4 rounded border-surface-line"
        />
        Tự động chạy ngay sau khi tạo
      </label>

      {error && (
        <p className="rounded-xl bg-status-failedSoft px-3 py-2 text-[13px] text-status-failed">
          {error}
        </p>
      )}

      <div className="flex gap-2 border-t border-surface-line pt-4">
        <button type="submit" className="btn-primary" disabled={submitting}>
          <Play size={15} />
          {submitting ? "Đang tạo…" : autoStart ? "Tạo và chạy đồng bộ" : "Tạo job"}
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