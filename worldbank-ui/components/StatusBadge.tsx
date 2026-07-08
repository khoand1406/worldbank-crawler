import { CheckCircle2, CircleDashed, Loader2, XCircle, Ban, type LucideIcon } from "lucide-react";

const CONFIG: Record<
  string,
  { bg: string; text: string; icon: LucideIcon }
> = {
  PENDING: { bg: "bg-status-pendingSoft", text: "text-status-pending", icon: CircleDashed },
  RUNNING: { bg: "bg-status-runningSoft", text: "text-status-running", icon: Loader2 },
  COMPLETED: { bg: "bg-status-completedSoft", text: "text-status-completed", icon: CheckCircle2 },
  FAILED: { bg: "bg-status-failedSoft", text: "text-status-failed", icon: XCircle },
  CANCELLED: { bg: "bg-status-cancelledSoft", text: "text-status-cancelled", icon: Ban },
  SUCCESS: { bg: "bg-status-completedSoft", text: "text-status-completed", icon: CheckCircle2 },
  ERROR: { bg: "bg-status-failedSoft", text: "text-status-failed", icon: XCircle },
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
  const cfg = CONFIG[status] ?? { bg: "bg-ink-muted/10", text: "text-ink-muted", icon: CircleDashed };
  const label = LABELS[status] ?? status;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <Icon size={12} className={status === "RUNNING" ? "animate-spin" : ""} />
      {label}
    </span>
  );
}
