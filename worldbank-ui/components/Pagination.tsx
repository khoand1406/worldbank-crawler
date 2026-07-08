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
    <div className="flex items-center justify-between border-t border-paper-line px-4 py-3">
      <p className="text-[13px] text-ink-soft/70">
        Hiển thị <span className="font-medium text-ink">{from}–{to}</span> trên{" "}
        <span className="font-medium text-ink">{total}</span> bản ghi
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-[13px]"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Trước
        </button>
        <span className="text-[13px] text-ink-soft/70">
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          className="btn-secondary px-3 py-1.5 text-[13px]"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Sau
        </button>
      </div>
    </div>
  );
}
