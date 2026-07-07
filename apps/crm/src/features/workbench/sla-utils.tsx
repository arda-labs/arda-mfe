import { Clock3 } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
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
      <Badge
        variant={sla.variant}
        className={cn("gap-1 tabular-nums", sla.className)}
      >
        <Clock3 className="size-3" />
        {sla.label}
      </Badge>
      {sla.detail && (
        <p className="text-xs text-muted-foreground tabular-nums">{sla.detail}</p>
      )}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "COMPLETED" || status === "APPROVED"
      ? "default"
      : status === "FAILED" || status === "REJECTED"
        ? "destructive"
        : "secondary"
  return <Badge variant={variant}>{status}</Badge>
}

export function ProgressRail({
  status,
  slaStatus,
}: {
  status?: string
  slaStatus?: SlaStatusValue
}) {
  const steps = ["READY", "CLAIMED", "COMPLETED"]
  const activeIndex = status === "COMPLETED" ? 2 : status === "CLAIMED" ? 1 : 0
  return (
    <div className="grid grid-cols-3 gap-1">
      {steps.map((step, index) => (
        <span
          key={step}
          className={cn(
            "h-1.5 rounded-full bg-muted",
            index <= activeIndex && "bg-primary",
            slaStatus === "BREACHED" &&
              index <= activeIndex &&
              "bg-destructive",
            status === "COMPLETED" && index <= activeIndex && "bg-emerald-600"
          )}
        />
      ))}
    </div>
  )
}

export function TimeProgress({ item }: { item: { status?: string; slaStatus?: SlaStatusValue; createdAt?: string; assignedAt?: string; updatedAt: string; slaDueAt?: string } }) {
  return (
    <div className="space-y-3">
      <ProgressRail status={item.status} slaStatus={item.slaStatus} />
      <div className="grid gap-2 text-xs tabular-nums sm:grid-cols-3">
        <TimePoint label="Bắt đầu" value={item.createdAt} />
        <TimePoint label="Hiện tại" value={item.assignedAt || item.updatedAt} />
        <TimePoint label="Hạn xử lý" value={item.slaDueAt} />
      </div>
    </div>
  )
}

function TimePoint({ label, value }: { label: string; value?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{formatDateTime(value)}</p>
    </div>
  )
}

export function slaInfo(
  dueAt?: string,
  status?: SlaStatusValue
): {
  label: string
  detail: string
  variant: "default" | "secondary" | "destructive" | "outline"
  className?: string
} {
  if (!dueAt || status === "NONE") {
    return {
      label: "Chưa gán SLA",
      detail: "Không có hạn xử lý",
      variant: "outline",
    }
  }
  const due = new Date(dueAt)
  if (Number.isNaN(due.getTime())) {
    return { label: "SLA", detail: dueAt, variant: "outline" }
  }
  const diffMs = due.getTime() - Date.now()
  if (diffMs < 0 || status === "BREACHED") {
    return {
      label: "Quá hạn",
      detail: `${durationLabel(-diffMs)} trước · ${formatDateTime(dueAt)}`,
      variant: "destructive",
    }
  }
  if (diffMs <= 2 * 60 * 60 * 1000) {
    return {
      label: "Sắp hết hạn",
      detail: `Còn ${durationLabel(diffMs)} · ${formatDateTime(dueAt)}`,
      variant: "secondary",
      className: "border-amber-300 bg-amber-50 text-amber-900",
    }
  }
  return {
    label: "Trong hạn",
    detail: `Còn ${durationLabel(diffMs)} · ${formatDateTime(dueAt)}`,
    variant: "secondary",
  }
}

function durationLabel(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60000))
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.ceil(minutes / 60)
  if (hours < 24) return `${hours} giờ`
  return `${Math.ceil(hours / 24)} ngày`
}
