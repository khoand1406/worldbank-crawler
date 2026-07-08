"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Link2, type LucideIcon } from "lucide-react";
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
    <div className="mx-auto max-w-4xl px-8 py-10">
      <Link
        href="/documents"
        className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-600 hover:text-brand-700"
      >
        <ArrowLeft size={14} />
        Quay lại danh sách tài liệu
      </Link>

      {loading ? (
        <div className="card p-10">
          <EmptyState tone="loading" title="Đang tải chi tiết tài liệu…" />
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
          <div className="card overflow-hidden">
            <div className="bg-brand-gradient-soft px-6 py-5">
              <div className="mb-3 flex items-center gap-3">
                <StampId value={doc.id} />
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-600 shadow-sm">
                  {sourceTypeLabel(doc.source_type)}
                </span>
              </div>
              <h1 className="font-display text-lg font-bold text-ink">{doc.display_title}</h1>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
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
                        className="rounded-full border border-surface-line bg-surface-muted px-2.5 py-1 text-[12px] text-ink-muted"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <div className="mb-3 flex items-center gap-2 text-ink-muted">
              <Link2 size={15} />
              <p className="eyebrow text-ink-muted">Liên kết tài liệu gốc</p>
            </div>
            <div className="flex flex-col gap-1">
              <LinkRow icon={ExternalLink} label="Trang đích (url)" href={doc.url} />
              <LinkRow icon={FileText} label="Tệp PDF (pdfurl)" href={doc.pdfurl} />
              <LinkRow icon={FileText} label="Bản text (txturl)" href={doc.txturl} />
            </div>
            <p className="mt-4 text-[12px] text-ink-muted/70">
              Hệ thống chỉ lưu đường dẫn — không tải và lưu trữ tệp PDF gốc (ngoài
              phạm vi dự án).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  href,
}: {
  icon: LucideIcon;
  label: string;
  href: string | null;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-muted">
      <span className="flex items-center gap-2 text-[13px] text-ink-muted">
        <Icon size={14} />
        {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="max-w-xs truncate text-[13px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
        >
          {href}
        </a>
      ) : (
        <span className="text-[13px] text-ink-muted/40">—</span>
      )}
    </div>
  );
}
