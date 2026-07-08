"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { WbDocument } from "@/lib/types";
import { formatDate, sourceTypeLabel } from "@/lib/format";
import EmptyState from "@/components/EmptyState";
import StampId from "@/components/StampId";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-1">{label}</p>
      <p className="text-sm text-ink">{children}</p>
    </div>
  );
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const [doc, setDoc] = useState<WbDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getDocument(params.id)
      .then((res) => {
        if (!cancelled) setDoc(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
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
  }, [params.id]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Link href="/documents" className="mb-6 inline-block text-[13px] text-signal hover:underline">
        ← Quay lại danh sách tài liệu
      </Link>

      {loading ? (
        <div className="card p-10">
          <EmptyState title="Đang tải chi tiết tài liệu…" />
        </div>
      ) : error || !doc ? (
        <div className="card p-10">
          <EmptyState
            tone="error"
            title="Không tải được tài liệu"
            description={error ?? "Không tìm thấy tài liệu."}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="card p-6">
            <div className="mb-3 flex items-center gap-3">
              <StampId value={doc.id} />
              <span className="rounded-sm bg-signal-soft px-2 py-0.5 text-[11px] font-medium text-signal">
                {sourceTypeLabel(doc.source_type)}
              </span>
            </div>
            <h1 className="text-lg font-semibold text-ink">{doc.display_title}</h1>

            <div className="mt-6 grid grid-cols-2 gap-5 md:grid-cols-3">
              <Field label="Ngày tài liệu">{formatDate(doc.docdt)}</Field>
              <Field label="Loại tài liệu">{doc.docty ?? "—"}</Field>
              <Field label="Nhóm tài liệu lớn">{doc.majdocty ?? "—"}</Field>
              <Field label="Quốc gia">{doc.count ?? "—"}</Field>
              <Field label="Vùng (region)">{doc.admreg ?? "—"}</Field>
              <Field label="Dự án">{doc.projn ?? "—"}</Field>
              <Field label="Ngôn ngữ">{doc.lang ?? "—"}</Field>
              <Field label="Công cụ cho vay">{doc.lndinstr ?? "—"}</Field>
              <Field label="Dòng sản phẩm">{doc.prdln ?? "—"}</Field>
              <Field label="Ngày công bố">{formatDate(doc.disclosure_date)}</Field>
              <Field label="Trạng thái công bố">{doc.disclstat ?? "—"}</Field>
              <Field label="Số trang">{doc.no_of_pages ?? "—"}</Field>
            </div>

            {doc.theme && doc.theme.length > 0 && (
              <div className="mt-6">
                <p className="eyebrow mb-2">Chủ đề</p>
                <div className="flex flex-wrap gap-2">
                  {doc.theme.map((t) => (
                    <span
                      key={t}
                      className="rounded-sm border border-paper-line bg-paper px-2 py-1 text-[12px] text-ink-soft"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <p className="eyebrow mb-3">Liên kết tài liệu gốc</p>
            <div className="flex flex-col gap-2 text-sm">
              <LinkRow label="Trang đích (url)" href={doc.url} />
              <LinkRow label="Tệp PDF (pdfurl)" href={doc.pdfurl} />
              <LinkRow label="Bản text (txturl)" href={doc.txturl} />
            </div>
            <p className="mt-4 text-[12px] text-ink-soft/50">
              Hệ thống chỉ lưu đường dẫn — không tải và lưu trữ tệp PDF gốc (ngoài
              phạm vi dự án).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkRow({ label, href }: { label: string; href: string | null }) {
  return (
    <div className="flex items-center justify-between border-b border-paper-line py-2 last:border-b-0">
      <span className="text-ink-soft/70">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="max-w-xs truncate text-signal hover:underline"
        >
          {href}
        </a>
      ) : (
        <span className="text-ink-soft/40">—</span>
      )}
    </div>
  );
}
