import { APP_TIMEZONE } from "@workspace/format"
import { cn } from "@workspace/ui/lib/utils"
import { StatusBadge as SharedStatusBadge } from "@workspace/ui/components/status-badge"
import { useI18n } from "@workspace/i18n"
import { formatDateTime } from "./step-labels"

type TFn = ReturnType<typeof useI18n>["t"]

type SlaStatusValue = "NONE" | "MET" | "WARNING" | "BREACHED" | undefined

export function SlaStatus({
  dueAt,
  status,
}: {
  dueAt?: string | null
  status?: SlaStatusValue
}) {
  const { t } = useI18n()
  const sla = slaInfo(dueAt, status, t)
  const [detailPrimary, detailSecondary] = splitSlaDetail(sla.detail)
  return (
    <div className="space-y-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs leading-none font-medium",
          sla.className
        )}
      >
        <span className={cn("size-1.5 rounded-full", sla.dotColor)} />
        {sla.label}
      </span>
      {sla.detail && (
        <p className="text-[11px] leading-tight text-muted-foreground tabular-nums">
          <span>{detailPrimary}</span>
          {detailSecondary ? (
            <span className="mt-0.5 block">{detailSecondary}</span>
          ) : null}
        </p>
      )}
    </div>
  )
}

function splitSlaDetail(detail: string) {
  const [primary, secondary] = detail.split(" · ")
  return [primary, secondary] as const
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

const statusMeta = (
  t: TFn
): Record<
  string,
  { label: string; variant: BadgeVariant; className: string }
> => ({
  SUBMITTED: {
    label: t("workflow.workbench.status_submitted"),
    variant: "secondary",
    className: "bg-info/10 text-info border-info/30",
  },
  IN_REVIEW: {
    label: t("workflow.workbench.status_in_review"),
    variant: "secondary",
    className: "bg-warning/10 text-warning-ink border-warning/30",
  },
  COMPLETED: {
    label: t("workflow.workbench.status_completed"),
    variant: "default",
    className: "bg-success/10 text-success border-success/30",
  },
  APPROVED: {
    label: t("workflow.workbench.status_approved"),
    variant: "default",
    className: "bg-success/10 text-success border-success/30",
  },
  REJECTED: {
    label: t("workflow.workbench.status_rejected"),
    variant: "destructive",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  FAILED: {
    label: t("workflow.workbench.status_failed"),
    variant: "destructive",
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  DRAFT: {
    label: t("workflow.workbench.status_draft"),
    variant: "secondary",
    className: "bg-muted text-muted-foreground border-border",
  },
  ACTIVE: {
    label: t("workflow.workbench.status_active"),
    variant: "default",
    className: "bg-success/10 text-success border-success/30",
  },
})

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n()
  const meta = statusMeta(t)[status] ?? {
    label: status,
    variant: "outline" as BadgeVariant,
    className: "border-border text-muted-foreground",
  }
  return <SharedStatusBadge status={status}>{meta.label}</SharedStatusBadge>
}

export function TimeProgress({
  item,
}: {
  item: {
    status?: string
    slaStatus?: SlaStatusValue
    createdAt?: string | null
    slaDueAt?: string | null
  }
}) {
  const { t } = useI18n()
  const sla =
    item.slaDueAt && item.slaStatus !== "NONE"
      ? slaInfo(item.slaDueAt, item.slaStatus, t)
      : null

  const progress = calcProgress(item.createdAt, item.slaDueAt, item.slaStatus)

  const duration =
    item.createdAt && item.slaDueAt
      ? slaDurationLabel(item.createdAt, item.slaDueAt, t)
      : t("workflow.workbench.no_sla")

  // Bar with the SLA length beside it, then start and deadline at the two
  // ends: three labels in one row overflowed the column at its min width.
  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center gap-2">
        <div className="relative h-2 min-w-10 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              !sla || sla.dotColor === "bg-success"
                ? "bg-success"
                : sla.dotColor === "bg-warning"
                  ? "bg-warning"
                  : "bg-destructive"
            )}
            style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
          />
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[11px] leading-none whitespace-nowrap tabular-nums",
            item.createdAt && item.slaDueAt
              ? "border border-border bg-background font-medium text-foreground"
              : "bg-muted/30 text-muted-foreground"
          )}
        >
          {duration}
        </span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] leading-tight whitespace-nowrap tabular-nums">
            <span className="font-medium text-foreground">{formatTime(item.createdAt)}</span>{" "}
            <span className="text-muted-foreground">{formatDate(item.createdAt)}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {t("workflow.workbench.start_label")}
          </p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[11px] leading-tight whitespace-nowrap tabular-nums">
            <span className="font-medium text-foreground">{formatTime(item.slaDueAt)}</span>{" "}
            <span className="text-muted-foreground">{formatDate(item.slaDueAt)}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {t("workflow.workbench.due_label")}
          </p>
        </div>
      </div>
    </div>
  )
}

function calcProgress(
  createdAt?: string | null,
  slaDueAt?: string | null,
  slaStatus?: SlaStatusValue
): number {
  if (!createdAt || !slaDueAt) return 0
  const start = new Date(createdAt).getTime()
  const end = new Date(slaDueAt).getTime()
  const now = Date.now()
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  if (now >= end || slaStatus === "BREACHED") return 100
  if (now <= start) return 0
  return ((now - start) / (end - start)) * 100
}

function formatTime(value?: string | null) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleTimeString("vi-VN", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(value?: string | null) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("vi-VN", {
    timeZone: APP_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function slaDurationLabel(createdAt: string, slaDueAt: string, t: TFn) {
  const start = new Date(createdAt).getTime()
  const end = new Date(slaDueAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return "-"
  return durationLabel(Math.max(0, end - start), t)
}

export function slaInfo(
  dueAt?: string | null,
  status?: SlaStatusValue,
  t: TFn = (key) => key
): {
  label: string
  detail: string
  className: string
  dotColor: string
} {
  if (!dueAt || status === "NONE") {
    return {
      label: t("workflow.workbench.no_sla"),
      detail: "",
      className: "text-muted-foreground bg-muted/30 border border-transparent",
      dotColor: "bg-muted-foreground/40",
    }
  }
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) {
    return {
      label: "SLA",
      detail: dueAt,
      className: "text-muted-foreground bg-muted/30 border border-transparent",
      dotColor: "bg-muted-foreground/40",
    }
  }
  const diffMs = due.getTime() - Date.now()
  if (diffMs < 0 || status === "BREACHED") {
    return {
      label: t("workflow.workbench.sla_overdue"),
      detail: formatSlaDetail(
        t,
        "workflow.workbench.sla_overdue_ago",
        -diffMs,
        dueAt
      ),
      className: "text-destructive bg-destructive/10 border border-destructive/30",
      dotColor: "bg-destructive",
    }
  }
  if (diffMs <= 2 * 60 * 60 * 1000) {
    return {
      label: t("workflow.workbench.sla_expiring"),
      detail: formatSlaDetail(
        t,
        "workflow.workbench.sla_remaining",
        diffMs,
        dueAt
      ),
      className: "text-warning-ink bg-warning/10 border border-warning/30",
      dotColor: "bg-warning",
    }
  }
  return {
    label: t("workflow.workbench.sla_in_time"),
    detail: formatSlaDetail(
      t,
      "workflow.workbench.sla_remaining",
      diffMs,
      dueAt
    ),
    className: "text-success bg-success/10 border border-success/30",
    dotColor: "bg-success",
  }
}

function formatSlaDetail(t: TFn, key: string, ms: number, dueAt: string) {
  const duration = durationLabel(ms, t)
  return t(key, { duration, datetime: formatDateTime(dueAt) })
}

function durationLabel(ms: number, t: TFn) {
  const minutes = Math.max(1, Math.ceil(ms / 60000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  const parts: string[] = []
  if (days) parts.push(t("workflow.workbench.duration_days", { count: days }))
  if (hours)
    parts.push(t("workflow.workbench.duration_hours", { count: hours }))
  if (mins || parts.length === 0)
    parts.push(
      t("workflow.workbench.duration_minutes", { count: mins || minutes })
    )
  return parts.join(" ")
}
