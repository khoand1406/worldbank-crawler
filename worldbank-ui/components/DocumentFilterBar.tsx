"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import type { DocumentFilters } from "@/lib/types";

interface DocumentFilterBarProps {
  value: DocumentFilters;
  onChange: (next: DocumentFilters) => void;
  onSubmit: () => void;
  onReset: () => void;
}

export default function DocumentFilterBar({
  value,
  onChange,
  onSubmit,
  onReset,
}: DocumentFilterBarProps) {
  function set<K extends keyof DocumentFilters>(key: K, v: DocumentFilters[K]) {
    onChange({ ...value, [key]: v });
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
        <div className="lg:col-span-2">
          <label className="eyebrow mb-1.5 block">Từ khoá tiêu đề</label>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted/60"
            />
            <input
              className="input pl-9"
              placeholder="vd: climate resilience"
              value={value.q ?? ""}
              onChange={(e) => set("q", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Nhóm dữ liệu</label>
          <select
            className="input"
            value={value.source_type ?? ""}
            onChange={(e) =>
              set("source_type", e.target.value as DocumentFilters["source_type"])
            }
          >
            <option value="">Tất cả</option>
            <option value="PROJECT_DOCUMENTS">Project Documents</option>
            <option value="PUBLICATIONS_RESEARCH">Publications & Research</option>
          </select>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Mã quốc gia</label>
          <input
            className="input"
            placeholder="vd: vietnam, burundi"
            value={value.country_key ?? ""}
            onChange={(e) => set("country_key", e.target.value)}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Vùng</label>
          <input
            className="input"
            placeholder="vd: East Asia and Pacific"
            value={value.region ?? ""}
            onChange={(e) => set("region", e.target.value)}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Nhóm tài liệu lớn</label>
          <select
            className="input"
            value={value.major_doc_type ?? ""}
            onChange={(e) => set("major_doc_type", e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="Project Documents">Project Documents</option>
            <option value="Publications & Research">Publications & Research</option>
          </select>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Loại tài liệu</label>
          <input
            className="input"
            placeholder="vd: Report, Brief, Working Paper"
            value={value.doc_type ?? ""}
            onChange={(e) => set("doc_type", e.target.value)}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Ngôn ngữ</label>
          <input
            className="input"
            placeholder="vd: English, French"
            value={value.language ?? ""}
            onChange={(e) => set("language", e.target.value)}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Từ ngày tài liệu</label>
          <input
            type="date"
            className="input"
            value={value.doc_date_from ?? ""}
            onChange={(e) => set("doc_date_from", e.target.value)}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Đến ngày tài liệu</label>
          <input
            type="date"
            className="input"
            value={value.doc_date_to ?? ""}
            onChange={(e) => set("doc_date_to", e.target.value)}
          />
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Sắp xếp theo</label>
          <select
            className="input"
            value={value.sort_by ?? "doc_date"}
            onChange={(e) =>
              set("sort_by", e.target.value as DocumentFilters["sort_by"])
            }
          >
            <option value="doc_date">Ngày tài liệu</option>
            <option value="disclosure_date">Ngày công bố</option>
            <option value="last_modified_date">Ngày cập nhật</option>
            <option value="country">Quốc gia</option>
            <option value="doc_type">Loại tài liệu</option>
            <option value="created_at">Ngày thu thập</option>
          </select>
        </div>

        <div>
          <label className="eyebrow mb-1.5 block">Thứ tự</label>
          <select
            className="input"
            value={value.sort_order ?? "desc"}
            onChange={(e) =>
              set("sort_order", e.target.value as DocumentFilters["sort_order"])
            }
          >
            <option value="desc">Mới nhất trước</option>
            <option value="asc">Cũ nhất trước</option>
          </select>
        </div>
      </div>

      <div className="mt-5 flex gap-2 border-t border-surface-line pt-5">
        <button type="submit" className="btn-primary">
          <Search size={15} />
          Áp dụng bộ lọc
        </button>

        <button type="button" className="btn-secondary" onClick={onReset}>
          <X size={15} />
          Xoá bộ lọc
        </button>
      </div>
    </form>
  );
}