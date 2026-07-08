"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, GitBranch } from "lucide-react";
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
        setDocuments(res.items);
        setTotal(res.total);
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
          <EmptyState tone="loading" title="Đang tải danh sách tài liệu…" />
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
                <GitBranch size={15} />
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
                    <tr key={doc.id} className="group transition-colors hover:bg-surface-muted">
                      <td className="td">
                        <StampId value={doc.id} />
                      </td>
                      <td className="td max-w-sm">
                        <Link
                          href={`/documents/${encodeURIComponent(doc.id)}`}
                          className="inline-flex items-center gap-1 font-medium text-ink hover:text-brand-600"
                        >
                          {doc.display_title}
                          <ArrowUpRight
                            size={13}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </Link>
                      </td>
                      <td className="td text-ink-muted">{doc.count ?? "—"}</td>
                      <td className="td text-ink-muted">{doc.docty ?? "—"}</td>
                      <td className="td text-ink-muted">
                        {formatDate(doc.docdt)}
                      </td>
                      <td className="td text-ink-muted">{doc.lang ?? "—"}</td>
                      <td className="td">
                        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
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
