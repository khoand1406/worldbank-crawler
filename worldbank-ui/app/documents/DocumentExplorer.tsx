"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { DocumentFilters, WbDocument } from "@/lib/types";
import { formatDate } from "@/lib/format";
import DocumentFilterBar from "@/components/DocumentFilterBar";
import Pagination from "@/components/Pagination";
import EmptyState from "@/components/EmptyState";
import StampId from "@/components/StampId";

const PAGE_SIZE = 20;
const EMPTY_FILTERS: DocumentFilters = { page: 1, page_size: PAGE_SIZE };

export default function DocumentsExplorer() {
  const [filters, setFilters] = useState<DocumentFilters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<DocumentFilters>(EMPTY_FILTERS);
  const [documents, setDocuments] = useState<WbDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .listDocuments(appliedFilters)
      .then((res) => {
  if (cancelled) return;

  console.log("Documents response:", res);

  setDocuments(Array.isArray(res.items) ? res.items : []);
  setTotal(typeof res.total === "number" ? res.total : 0);
})
      .catch((err: unknown) => {
        if (cancelled) return;
        setDocuments([]);
        setTotal(0);
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
  }, [appliedFilters]);

  function applyFilters() {
    setAppliedFilters({ ...filters, page: 1 });
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  function goToPage(page: number) {
    setAppliedFilters((prev) => ({ ...prev, page }));
  }

  return (
    <div className="space-y-5">
      <DocumentFilterBar
        value={filters}
        onChange={setFilters}
        onSubmit={applyFilters}
        onReset={resetFilters}
      />

      <div className="card overflow-hidden">
        {loading ? (
          <EmptyState title="Đang tải danh sách tài liệu…" />
        ) : error ? (
          <EmptyState
            tone="error"
            title="Không tải được dữ liệu"
            description={error}
          />
        ) : documents.length === 0 ? (
          <EmptyState
            title="Không tìm thấy tài liệu phù hợp"
            description="Thử nới lỏng bộ lọc, hoặc kiểm tra xem đã có lượt đồng bộ nào hoàn tất cho nhóm dữ liệu này chưa."
            action={
              <Link href="/sync-jobs" className="btn-secondary mt-2">
                Xem lượt đồng bộ
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="th">Mã tài liệu</th>
                    <th className="th">Tiêu đề</th>
                    <th className="th">Quốc gia</th>
                    <th className="th">Loại</th>
                    <th className="th">Ngày tài liệu</th>
                    <th className="th">Ngôn ngữ</th>
                    <th className="th">Nhóm</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-paper">
                      <td className="td">
                        <StampId value={doc.id} />
                      </td>
                      <td className="td max-w-sm">
                        <Link
                          href={`/documents/${encodeURIComponent(doc.id)}`}
                          className="font-medium text-ink hover:text-signal hover:underline"
                        >
                          {doc.display_title}
                        </Link>
                      </td>
                      <td className="td text-ink-soft/80">{doc.count ?? "—"}</td>
                      <td className="td text-ink-soft/80">{doc.docty ?? "—"}</td>
                      <td className="td text-ink-soft/80">
                        {formatDate(doc.docdt)}
                      </td>
                      <td className="td text-ink-soft/80">{doc.lang ?? "—"}</td>
                      <td className="td">
                        <span className="rounded-sm bg-signal-soft px-2 py-0.5 text-[11px] font-medium text-signal">
                          {doc.source_type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={appliedFilters.page ?? 1}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={goToPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
