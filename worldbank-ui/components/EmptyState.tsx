interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "empty" | "error";
}

export default function EmptyState({
  title,
  description,
  action,
  tone = "empty",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span
        className={`h-2 w-2 rounded-full ${
          tone === "error" ? "bg-status-failed" : "bg-ink-soft/30"
        }`}
      />
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && (
        <p className="max-w-md text-[13px] text-ink-soft/60">{description}</p>
      )}
      {action}
    </div>
  );
}