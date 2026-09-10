import { APP_TIMEZONE } from "@workspace/format"
import { cn } from "@workspace/ui/lib/utils"
import { useI18n } from "@workspace/i18n"
import { formatDateTime } from "./step-labels"

type TFn = ReturnType<typeof useI18n>["t"]

type SlaStatusValue = "NONE" | "MET" | "WARNING" | "BREACHED" | undefined

export function SlaStatus({
  dueAt,
  status,
}: {
  dueAt?: string
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
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  IN_REVIEW: {
    label: t("workflow.workbench.status_in_review"),
    variant: "secondary",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  COMPLETED: {
    label: t("workflow.workbench.status_completed"),
    variant: "default",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  APPROVED: {
    label: t("workflow.workbench.status_approved"),
    variant: "default",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: t("workflow.workbench.status_rejected"),
    variant: "destructive",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  FAILED: {
    label: t("workflow.workbench.status_failed"),
    variant: "destructive",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  DRAFT: {
    label: t("workflow.workbench.status_draft"),
    variant: "secondary",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
  ACTIVE: {
    label: t("workflow.workbench.status_active"),
    variant: "default",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
})

export function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n()
  const meta = statusMeta(t)[status] ?? {
    label: status,
    variant: "outline" as BadgeVariant,
    className: "border-border text-muted-foreground",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-medium",
        meta.className
      )}
    >
      {meta.label}
    </span>
  )
}

export function TimeProgress({
  item,
}: {
  item: {
    status?: string
    slaStatus?: SlaStatusValue
    createdAt?: string
    slaDueAt?: string
  }
}) {
  const { t } = useI18n()
  const sla =
    item.slaDueAt && item.slaStatus !== "NONE"
      ? slaInfo(item.slaDueAt, item.slaStatus, t)
      : null

  const progress = calcProgress(item.createdAt, item.slaDueAt, item.slaStatus)

  return (
    <div className="space-y-2 py-1">
      {/* Bar */}
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            !sla || sla.dotColor === "bg-emerald-500"
              ? "bg-emerald-500"
              : sla.dotColor === "bg-amber-500"
                ? "bg-amber-500"
                : "bg-red-500"
          )}
          style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
        />
      </div>

      {/* Labels row */}
      <div className="flex items-start justify-between gap-4">
        {/* Start */}
        <div className="min-w-0">
          <p className="text-[11px] leading-tight font-medium text-foreground">
            {formatTime(item.createdAt)}
          </p>
          <p className="text-[10px] leading-tight text-muted-foreground tabular-nums">
            {formatDate(item.createdAt)}
          </p>
          <p className="mt-0.5 text-[9px] text-muted-foreground/60">
            {t("workflow.workbench.start_label")}
          </p>
        </div>

        {/* SLA duration */}
        {item.createdAt && item.slaDueAt ? (
          <div className="shrink-0 text-center">
            <span className="inline-flex items-center rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] leading-none font-medium text-foreground tabular-nums">
              {slaDurationLabel(item.createdAt, item.slaDueAt, t)}
            </span>
          </div>
        ) : (
          <div className="shrink-0 text-center">
            <span className="inline-flex items-center rounded-md bg-muted/30 px-1.5 py-0.5 text-[11px] text-muted-foreground">
              {t("workflow.workbench.no_sla")}
            </span>
          </div>
        )}

        {/* Deadline */}
        <div className="min-w-0 text-right">
          <p className="text-[11px] leading-tight font-medium text-foreground">
            {formatTime(item.slaDueAt)}
          </p>
          <p className="text-[10px] leading-tight text-muted-foreground tabular-nums">
            {formatDate(item.slaDueAt)}
          </p>
          <p className="mt-0.5 text-[9px] text-muted-foreground/60">
            {t("workflow.workbench.due_label")}
          </p>
        </div>
      </div>
    </div>
  )
}

function calcProgress(
  createdAt?: string,
  slaDueAt?: string,
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

function formatTime(value?: string) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleTimeString("vi-VN", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(value?: string) {
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
  dueAt?: string,
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
      className: "text-red-700 bg-red-50 border border-red-200",
      dotColor: "bg-red-500",
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
      className: "text-amber-700 bg-amber-50 border border-amber-200",
      dotColor: "bg-amber-500",
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
    className: "text-emerald-700 bg-emerald-50 border border-emerald-200",
    dotColor: "bg-emerald-500",
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
