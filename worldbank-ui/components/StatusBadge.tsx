const STYLES: Record<string, string> = {
  PENDING: "bg-status-pending/10 text-status-pending border-status-pending/30",
  RUNNING: "bg-status-running/10 text-status-running border-status-running/30",
  COMPLETED: "bg-status-completed/10 text-status-completed border-status-completed/30",
  FAILED: "bg-status-failed/10 text-status-failed border-status-failed/30",
  CANCELLED: "bg-status-cancelled/10 text-status-cancelled border-status-cancelled/30",
  SUCCESS: "bg-status-completed/10 text-status-completed border-status-completed/30",
  ERROR: "bg-status-failed/10 text-status-failed border-status-failed/30",
};

const LABELS: Record<string, string> = {
  PENDING: "Chờ chạy",
  RUNNING: "Đang chạy",
  COMPLETED: "Hoàn tất",
  FAILED: "Thất bại",
  CANCELLED: "Đã huỷ",
  SUCCESS: "Thành công",
  ERROR: "Lỗi",
};

export default function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-ink-soft/10 text-ink-soft border-ink-soft/30";
  const label = LABELS[status] ?? status;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
