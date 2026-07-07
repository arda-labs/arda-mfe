import {
  ArrowDownToLine,
  ArrowUpFromLine,
  FileText,
  Users,
} from "lucide-react"
import { getMediaContentUrl } from "@workspace/core/media/urls"
import { Badge } from "@workspace/ui/components/badge"
import { cn } from "@workspace/ui/lib/utils"
import type { WorkItem } from "./api"
import { stepLabel as formatStepLabel } from "./step-labels"

const priorityColors: Record<string, string> = {
  HIGH: "bg-red-500",
  URGENT: "bg-red-500",
  MEDIUM: "bg-amber-500",
  NORMAL: "bg-sky-500",
  LOW: "bg-slate-300",
}

const caseTypeIcons: Record<string, typeof FileText> = {
  CUSTOMER_REGISTRATION: Users,
  CUSTOMER_ADJUSTMENT: FileText,
  FINANCE_INCOMING_TRANSACTION: ArrowDownToLine,
  FINANCE_OUTGOING_TRANSACTION: ArrowUpFromLine,
}

const caseTypeColors: Record<string, string> = {
  CUSTOMER_REGISTRATION: "text-violet-600 bg-violet-50 border-violet-200",
  CUSTOMER_ADJUSTMENT: "text-amber-600 bg-amber-50 border-amber-200",
  FINANCE_INCOMING_TRANSACTION: "text-emerald-600 bg-emerald-50 border-emerald-200",
  FINANCE_OUTGOING_TRANSACTION: "text-blue-600 bg-blue-50 border-blue-200",
  HRM_EMPLOYEE_REGISTRATION: "text-pink-600 bg-pink-50 border-pink-200",
}

export function WorkItemCard({
  item,
  claiming,
  onOpen,
}: {
  item: WorkItem
  claiming: boolean
  onOpen: (item: WorkItem) => void
}) {
  const canAct = onOpen != null
  const priority = (item.priority ?? "").toUpperCase()
  const hasPriority = priority in priorityColors
  const CaseIcon = caseTypeIcons[item.caseType] ?? FileText
  const typeColor = caseTypeColors[item.caseType] ?? "text-muted-foreground bg-muted/30 border-muted"

  return (
    <div
      className={cn(
        "flex min-w-0 items-start gap-3 rounded-md px-2 py-2 -mx-2",
        canAct && "cursor-pointer hover:bg-accent/50 transition-colors"
      )}
      onClick={() => {
        if (canAct) onOpen(item)
      }}
      role={canAct ? "button" : undefined}
      tabIndex={canAct ? 0 : undefined}
      onKeyDown={(e) => {
        if (canAct && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onOpen(item)
        }
      }}
    >
      {/* Priority dot */}
      {hasPriority ? (
        <span className={cn("mt-2.5 size-2 shrink-0 rounded-full", priorityColors[priority])} />
      ) : (
        <span className="mt-2.5 size-2 shrink-0 rounded-full bg-transparent" />
      )}

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Top row: title + type icon */}
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground group-hover:text-accent-foreground">
            {item.title}
          </p>
          <span className={cn("inline-flex size-4 shrink-0 items-center justify-center rounded-sm border", typeColor)}>
            <CaseIcon className="size-2.5" />
          </span>
        </div>

        {/* Description */}
        {item.description || item.summary ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {item.description || item.summary}
          </p>
        ) : null}

        {/* Meta row: badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Case code */}
          <CodeBadge code={item.caseCode} />

          {/* Step label */}
          <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-normal leading-none">
            {formatStepLabel(item.stepCode || item.currentStep || "-")}
          </Badge>

          {/* SLA status inline */}
          {item.slaDueAt && item.slaStatus && item.slaStatus !== "NONE" ? (
            <SlaInline
              dueAt={item.slaDueAt}
              status={item.slaStatus}
            />
          ) : null}

          {/* Assignee */}
          {item.assignedTo ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground leading-none">
              <span className="flex size-3.5 shrink-0 items-center justify-center rounded-full bg-muted text-[7px] font-medium overflow-hidden">
                {item.assignedToAvatar ? (
                  <img src={getMediaContentUrl(item.assignedToAvatar)} alt="" className="size-full object-cover" />
                ) : (
                  (item.assignedToName || item.assignedTo).charAt(0).toUpperCase()
                )}
              </span>
              {item.assignedToName || item.assignedTo}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CodeBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded-md border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground leading-none">
      {code}
    </span>
  )
}

function SlaInline({
  dueAt,
  status,
}: {
  dueAt: string
  status: string
}) {
  const due = new Date(dueAt)
  const diff = due.getTime() - Date.now()
  const overdue = diff < 0 || status === "BREACHED"
  const warning = !overdue && diff <= 2 * 60 * 60 * 1000

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md border px-1.5 text-[10px] font-medium leading-none",
        overdue
          ? "border-red-200 bg-red-50 text-red-700"
          : warning
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      <span
        className={cn(
          "mr-1 size-1.5 rounded-full",
          overdue ? "bg-red-500" : warning ? "bg-amber-500" : "bg-emerald-500"
        )}
      />
      {overdue ? "Quá hạn" : warning ? "Sắp hết hạn" : "Trong hạn"}
    </span>
  )
}
