"use client";

import { DocumentFilters } from "@/lib/types";

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
      className="card grid grid-cols-1 gap-4 p-5 md:grid-cols-3 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="lg:col-span-2">
        <label className="eyebrow mb-1.5 block">Từ khoá tiêu đề</label>
        <input
          className="input"
          placeholder="vd: climate resilience"
          value={value.q ?? ""}
          onChange={(e) => set("q", e.target.value)}
        />
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
          <option value="A">Nhóm A — Project Documents</option>
          <option value="B">Nhóm B — Publications & Research</option>
        </select>
      </div>

      <div>
        <label className="eyebrow mb-1.5 block">Mã quốc gia</label>
        <input
          className="input"
          placeholder="vd: VN, US"
          value={value.country_key ?? ""}
          onChange={(e) => set("country_key", e.target.value)}
        />
      </div>

      <div>
        <label className="eyebrow mb-1.5 block">Vùng (region)</label>
        <input
          className="input"
          placeholder="vd: East Asia and Pacific"
          value={value.admreg ?? ""}
          onChange={(e) => set("admreg", e.target.value)}
        />
      </div>

      <div>
        <label className="eyebrow mb-1.5 block">Loại tài liệu (majdocty)</label>
        <input
          className="input"
          placeholder="vd: Project Documents"
          value={value.majdocty ?? ""}
          onChange={(e) => set("majdocty", e.target.value)}
        />
      </div>

      <div>
        <label className="eyebrow mb-1.5 block">Ngôn ngữ</label>
        <input
          className="input"
          placeholder="vd: English"
          value={value.lang ?? ""}
          onChange={(e) => set("lang", e.target.value)}
        />
      </div>

      <div>
        <label className="eyebrow mb-1.5 block">Từ ngày</label>
        <input
          type="date"
          className="input"
          value={value.strdate ?? ""}
          onChange={(e) => set("strdate", e.target.value)}
        />
      </div>

      <div>
        <label className="eyebrow mb-1.5 block">Đến ngày</label>
        <input
          type="date"
          className="input"
          value={value.enddate ?? ""}
          onChange={(e) => set("enddate", e.target.value)}
        />
      </div>

      <div className="flex items-end gap-2 lg:col-span-4">
        <button type="submit" className="btn-primary">
          Áp dụng bộ lọc
        </button>
        <button type="button" className="btn-secondary" onClick={onReset}>
          Xoá bộ lọc
        </button>
      </div>
    </form>
  );
}
