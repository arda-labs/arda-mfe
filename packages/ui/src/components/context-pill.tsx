import { useI18n } from "@workspace/i18n"
import { formatDateShort } from "@workspace/format"
import { cn } from "@workspace/ui/lib/utils"

/** platform-service system date states (domain/calendar.go). */
export type BusinessDayStatus = "OPEN" | "EOD_PROCESSING" | "CLOSED"

export type ContextPillProps = {
  /** Working unit: organisation or tenant name. */
  unit?: string
  /** Current business date, ISO "yyyy-MM-dd" (time part ignored). */
  businessDate?: string
  status?: BusinessDayStatus | string
  /** Calendar date to compare with, ISO; differs → amber. */
  today: string
  /** Sidebar rail: date only. */
  compact?: boolean
  className?: string
}

const STATUS_KEY: Record<string, string> = {
  OPEN: "common.context.status_open",
  EOD_PROCESSING: "common.context.status_eod",
  CLOSED: "common.context.status_closed",
}

/**
 * Where and when the user is working (design board 09): unit, business date
 * and end-of-day state. Turns amber while EOD runs or when the business date
 * is not today, so postings never land on a date nobody noticed.
 */
export function ContextPill({
  unit,
  businessDate,
  status,
  today,
  compact = false,
  className,
}: ContextPillProps) {
  const { t } = useI18n()
  const date = businessDate?.slice(0, 10)
  const offDay = Boolean(date) && date !== today
  const running = status === "EOD_PROCESSING"
  const warn = offDay || running
  const statusLabel = status && STATUS_KEY[status] ? t(STATUS_KEY[status]) : undefined
  const dateText = date ? formatDateShort(date) : t("common.context.date_unknown")

  const details = [
    unit,
    `${t("common.context.business_date")}: ${dateText}`,
    statusLabel,
    offDay ? t("common.context.date_mismatch", { today: formatDateShort(today) }) : undefined,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <div
      role="status"
      title={details}
      aria-label={details}
      data-slot="context-pill"
      data-warn={warn || undefined}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
        warn
          ? "border-warning/40 bg-warning/10 text-warning-ink"
          : "border-transparent bg-sidebar-accent/60 text-sidebar-foreground",
        compact && "justify-center px-1.5",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          running
            ? "animate-pulse bg-warning"
            : status === "OPEN"
              ? "bg-success"
              : "bg-muted-foreground"
        )}
      />
      {compact ? (
        <span className="font-mono text-[11px] tabular-nums">{date ? dateText.slice(0, 5) : "—"}</span>
      ) : (
        <>
          {unit ? <span className="min-w-0 truncate font-medium">{unit}</span> : null}
          {unit ? <span aria-hidden className="text-muted-foreground">·</span> : null}
          <span className="shrink-0 font-mono tabular-nums">{dateText}</span>
          {running ? (
            <span className="ml-auto shrink-0 font-medium">{t("common.context.eod_short")}</span>
          ) : offDay ? (
            <span className="ml-auto shrink-0 font-medium">≠ {formatDateShort(today).slice(0, 5)}</span>
          ) : null}
        </>
      )}
    </div>
  )
}
