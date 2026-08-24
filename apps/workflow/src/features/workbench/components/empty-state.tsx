import { cn } from "@workspace/ui/lib/utils"

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-16 text-center",
        className
      )}
    >
      <div className="flex size-16 items-center justify-center rounded-full bg-muted/50">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground/40"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="max-w-64 text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export function TableEmptyState({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <EmptyState
          title="Không có việc cần xử lý"
          description="Khi có giao dịch được giao, chúng sẽ xuất hiện ở đây."
        />
      </td>
    </tr>
  )
}
