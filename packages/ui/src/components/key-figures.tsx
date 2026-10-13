import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

export type KeyFigure = {
  label: string
  value: ReactNode
  hint?: ReactNode
  /** Emphasises one figure: due soon (warning), overdue (danger), all clear. */
  tone?: "default" | "warning" | "danger" | "success"
  /** 0..1 progress drawn under the value (e.g. disbursed / limit). */
  progress?: number
}

/**
 * The 3–6 numbers a record is judged by, enlarged (design board 14,
 * "phóng to cái quan trọng"). Values should already be formatted.
 */
export function KeyFigures({
  items,
  className,
}: {
  items: KeyFigure[]
  className?: string
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]",
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            "flex min-w-0 flex-col gap-1 rounded-xl border bg-card px-4 py-3 shadow-card",
            item.tone === "warning" && "border-warning/40 bg-warning/5",
            item.tone === "danger" && "border-destructive/40 bg-destructive/5"
          )}
        >
          <dt className="truncate text-xs text-muted-foreground">{item.label}</dt>
          <dd
            className={cn(
              "truncate text-lg leading-tight font-semibold tracking-[-0.01em] tabular-nums",
              item.tone === "danger" && "text-destructive",
              item.tone === "success" && "text-success"
            )}
          >
            {item.value}
          </dd>
          {item.progress !== undefined ? (
            <dd aria-hidden className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${Math.round(Math.min(Math.max(item.progress, 0), 1) * 100)}%`,
                }}
              />
            </dd>
          ) : null}
          {item.hint ? (
            <dd className="truncate text-xs text-muted-foreground">{item.hint}</dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}
