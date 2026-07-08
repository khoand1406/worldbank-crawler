import { AlertCircle, Inbox, Loader2, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "empty" | "error" | "loading";
}

export default function EmptyState({
  title,
  description,
  action,
  tone = "empty",
}: EmptyStateProps) {
  const Icon = tone === "error" ? AlertCircle : tone === "loading" ? Loader2 : Inbox;
  const iconClass =
    tone === "error"
      ? "bg-status-failedSoft text-status-failed"
      : "bg-brand-50 text-brand-500";

  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className={`flex h-11 w-11 items-center justify-center rounded-full ${iconClass}`}>
        <Icon size={20} className={tone === "loading" ? "animate-spin" : ""} />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="max-w-md text-[13px] text-ink-muted">{description}</p>
      )}
      {action}
    </div>
  );
}
