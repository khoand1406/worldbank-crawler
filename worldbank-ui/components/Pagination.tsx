import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between border-t border-surface-line px-5 py-3.5">
      <p className="text-[13px] text-ink-muted">
        Hiển thị <span className="font-semibold text-ink">{from}–{to}</span> trên{" "}
        <span className="font-semibold text-ink">{total}</span> bản ghi
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary h-8 w-8 !p-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-[13px] font-medium text-ink-muted">
          {page}/{totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary h-8 w-8 !p-0"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
