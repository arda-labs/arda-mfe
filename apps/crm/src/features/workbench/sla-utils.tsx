import { cn } from "@workspace/ui/lib/utils"
import { formatDateTime } from "./step-labels"

type SlaStatusValue = "NONE" | "MET" | "WARNING" | "BREACHED" | undefined

export function SlaStatus({
  dueAt,
  status,
}: {
  dueAt?: string
  status?: SlaStatusValue
}) {
  const sla = slaInfo(dueAt, status)
  return (
    <div className="space-y-1">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium leading-none",
          sla.className
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            sla.dotColor
          )}
        />
        {sla.label}
      </span>
      {sla.detail && (
        <p className="text-[11px] text-muted-foreground tabular-nums leading-tight">
          {sla.detail}
        </p>
      )}
    </div>
  )
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

const statusMeta: Record<string, { label: string; variant: BadgeVariant; className: string }> = {
  SUBMITTED: {
    label: "Đã gửi",
    variant: "secondary",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  IN_REVIEW: {
    label: "Đang xử lý",
    variant: "secondary",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  COMPLETED: {
    label: "Hoàn tất",
    variant: "default",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  APPROVED: {
    label: "Đã duyệt",
    variant: "default",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Từ chối",
    variant: "destructive",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  FAILED: {
    label: "Thất bại",
    variant: "destructive",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  DRAFT: {
    label: "Nháp",
    variant: "secondary",
    className: "bg-slate-50 text-slate-600 border-slate-200",
  },
  ACTIVE: {
    label: "Đang hoạt động",
    variant: "default",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
}

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] ?? {
    label: status,
    variant: "outline" as BadgeVariant,
    className: "border-border text-muted-foreground",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-none",
        meta.className
      )}
    >
      {meta.label}
    </span>
  )
}

export function TimeProgress({ item }: { item: { status?: string; slaStatus?: SlaStatusValue; createdAt?: string; slaDueAt?: string } }) {
  const sla = item.slaDueAt && item.slaStatus !== "NONE"
    ? slaInfo(item.slaDueAt, item.slaStatus)
    : null

  const progress = calcProgress(item.createdAt, item.slaDueAt, item.slaStatus)

  return (
    <div className="space-y-2 py-1">
      {/* Bar */}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
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
          <p className="text-[11px] font-medium text-foreground leading-tight">
            {formatTime(item.createdAt)}
          </p>
          <p className="text-[10px] text-muted-foreground tabular-nums leading-tight">
            {formatDate(item.createdAt)}
          </p>
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">Bắt đầu</p>
        </div>

        {/* SLA badge giữa */}
        {sla ? (
          <div className="shrink-0 text-center">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-none",
                sla.className
              )}
            >
              <span className={cn("size-1.5 rounded-full", sla.dotColor)} />
              {sla.label}
            </span>
            {sla.detail && (
              <p className="mt-0.5 text-[9px] text-muted-foreground tabular-nums leading-tight">
                {sla.detail}
              </p>
            )}
          </div>
        ) : (
          <div className="shrink-0 text-center">
            <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground bg-muted/30">
              Chưa có SLA
            </span>
          </div>
        )}

        {/* Deadline */}
        <div className="min-w-0 text-right">
          <p className="text-[11px] font-medium text-foreground leading-tight">
            {formatTime(item.slaDueAt)}
          </p>
          <p className="text-[10px] text-muted-foreground tabular-nums leading-tight">
            {formatDate(item.slaDueAt)}
          </p>
          <p className="text-[9px] text-muted-foreground/60 mt-0.5">Hạn xử lý</p>
        </div>
      </div>
    </div>
  )
}

function calcProgress(createdAt?: string, slaDueAt?: string, slaStatus?: SlaStatusValue): number {
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
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
}

function formatDate(value?: string) {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function TimePoint({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-muted-foreground leading-none">{label}</p>
      <p className="font-medium text-foreground">{formatDateTime(value)}</p>
    </div>
  )
}

export function slaInfo(
  dueAt?: string,
  status?: SlaStatusValue
): {
  label: string
  detail: string
  className: string
  dotColor: string
} {
  if (!dueAt || status === "NONE") {
    return {
      label: "Chưa có SLA",
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
      label: "Quá hạn",
      detail: `${durationLabel(-diffMs)} trước · ${formatDateTime(dueAt)}`,
      className: "text-red-700 bg-red-50 border border-red-200",
      dotColor: "bg-red-500",
    }
  }
  if (diffMs <= 2 * 60 * 60 * 1000) {
    return {
      label: "Sắp hết hạn",
      detail: `Còn ${durationLabel(diffMs)} · ${formatDateTime(dueAt)}`,
      className: "text-amber-700 bg-amber-50 border border-amber-200",
      dotColor: "bg-amber-500",
    }
  }
  return {
    label: "Trong hạn",
    detail: `Còn ${durationLabel(diffMs)} · ${formatDateTime(dueAt)}`,
    className: "text-emerald-700 bg-emerald-50 border border-emerald-200",
    dotColor: "bg-emerald-500",
  }
}

function durationLabel(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60000))
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.ceil(minutes / 60)
  if (hours < 24) return `${hours} giờ`
  return `${Math.ceil(hours / 24)} ngày`
}
