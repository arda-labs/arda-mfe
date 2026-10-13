import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { dateInputValue, formatDateShort, todayISO } from "@workspace/format"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import { cn } from "@workspace/ui/lib/utils"

export type ActivityTone = "neutral" | "info" | "success" | "warning" | "danger"

export type ActivityItem = {
  id: string | number
  /** Translated verb phrase: "Gửi duyệt hồ sơ", "Phê duyệt". */
  action: ReactNode
  actor?: string
  /** ISO timestamp. */
  at: string
  /** Status codes the event moved between (shown as StatusBadge). */
  from?: string
  to?: string
  /** Free-text comment attached to the event. */
  note?: string
  tone?: ActivityTone
}

const RING: Record<ActivityTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning-ink",
  danger: "bg-destructive/10 text-destructive",
}

/** "Trần Thị Hà" → "TH", "system" → "S". */
export function initials(name: string | undefined) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "·"
  const first = words[0]![0] ?? ""
  const last = words.length > 1 ? (words[words.length - 1]![0] ?? "") : ""
  return (first + last).toUpperCase()
}

/** Items grouped by calendar day (app timezone), newest day first. */
export function groupByDay<T extends { at: string }>(items: T[]) {
  const sorted = [...items].sort((a, b) => b.at.localeCompare(a.at))
  const groups: { day: string; items: T[] }[] = []
  for (const item of sorted) {
    const day = dateInputValue(item.at)
    const group = groups[groups.length - 1]
    if (group && group.day === day) group.items.push(item)
    else groups.push({ day, items: [item] })
  }
  return groups
}

/**
 * Who did what and when (design board 09, ActivityLog): a feed grouped by
 * day with the actor's initials, the status move as badges and comments as
 * quotes. Replaces the two EPAS tables (trace + comments) with one story.
 */
export function ActivityLog({
  items,
  emptyText,
  className,
}: {
  items: ActivityItem[]
  emptyText?: string
  className?: string
}) {
  const { t, formatDate } = useI18n()
  if (items.length === 0) {
    return (
      <p className={cn("py-8 text-center text-sm text-muted-foreground", className)}>
        {emptyText ?? t("common.activity.empty")}
      </p>
    )
  }
  const today = todayISO()

  return (
    <div data-slot="activity-log" className={cn("space-y-5", className)}>
      {groupByDay(items).map((group) => (
        <section key={group.day} className="space-y-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {group.day === today ? t("common.activity.today") : formatDateShort(group.day)}
          </h3>
          <ol className="space-y-3">
            {group.items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <span
                  aria-hidden
                  title={item.actor}
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                    RING[item.tone ?? "neutral"]
                  )}
                >
                  {initials(item.actor)}
                </span>
                <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                  <p className="text-sm leading-snug">
                    {item.actor ? <span className="font-medium">{item.actor} </span> : null}
                    <span className={cn(item.actor && "text-muted-foreground")}>{item.action}</span>
                    <time
                      dateTime={item.at}
                      title={formatDate(item.at, { dateStyle: "medium", timeStyle: "medium" })}
                      className="ml-2 text-xs text-muted-foreground tabular-nums"
                    >
                      {formatDate(item.at, { timeStyle: "short" })}
                    </time>
                  </p>
                  {item.from || item.to ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.from ? <StatusBadge status={item.from} dot={false} /> : null}
                      {item.from && item.to ? (
                        <ArrowRight aria-hidden className="size-3 text-muted-foreground" />
                      ) : null}
                      {item.to ? <StatusBadge status={item.to} dot={false} /> : null}
                    </div>
                  ) : null}
                  {item.note ? (
                    <blockquote className="rounded-lg rounded-tl-none border bg-muted/40 px-3 py-2 text-sm whitespace-pre-line">
                      {item.note}
                    </blockquote>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}
