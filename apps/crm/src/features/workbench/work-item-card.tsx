import { Eye } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import type { WorkItem } from "./api"
import { stepLabel as formatStepLabel } from "./step-labels"

export function WorkItemCard({
  item,
  claiming,
  forceOpen,
  compact,
  onOpen,
}: {
  item: WorkItem
  claiming: boolean
  forceOpen?: boolean
  compact?: boolean
  onOpen: (item: WorkItem) => void
}) {
  const canAct = forceOpen || item.canClaim || item.canOpen

  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="min-w-0 space-y-2">
        <div>
          <p className={compact ? "truncate font-medium" : "font-medium text-pretty"}>
            {item.title}
          </p>
          {!compact && (item.description || item.summary) && (
            <p className="line-clamp-2 text-sm text-pretty text-muted-foreground">
              {item.description || item.summary}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline">{item.caseCode}</Badge>
          <Badge variant="secondary">
            {formatStepLabel(item.stepCode || item.currentStep || "-")}
          </Badge>
          {item.taskType ? (
            <Badge variant="outline" className="font-mono text-[11px]">
              {item.taskType}
            </Badge>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant={item.canClaim ? "default" : "outline"}
        disabled={claiming || !canAct}
        onClick={(event) => {
          event.stopPropagation()
          onOpen(item)
        }}
        className="shrink-0"
      >
        <Eye className="size-4" />
        {forceOpen
          ? "Mở"
          : item.canClaim
            ? "Nhận & mở"
            : item.canOpen
              ? "Mở"
              : "Đã giữ"}
      </Button>
    </div>
  )
}
