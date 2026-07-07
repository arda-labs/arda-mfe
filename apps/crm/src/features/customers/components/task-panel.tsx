import { Check, RotateCcw, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { CustomerTaskContext } from "../shared/task-context"
import { hasTaskContext } from "../shared/task-context"
import { ContextField, Panel } from "../shared/ui"

export function CurrentTaskPanel({
  context,
  completing,
  onComplete,
}: {
  context: CustomerTaskContext
  completing: boolean
  onComplete: (decision: string) => void
}) {
  if (!hasTaskContext(context)) return null

  const checkerTask = context.role !== "CUSTOMER_MAKER"
  if (!checkerTask) return null
  return (
    <Panel title="Việc BPM hiện tại">
      <div className="grid gap-3 text-sm md:grid-cols-5">
        <ContextField label="Mã case" value={context.caseCode || context.caseId} />
        <ContextField label="Task key" value={context.taskKey?.toString()} />
        <ContextField label="Bước" value={context.elementId} />
        <ContextField label="Vai trò" value={context.role} />
        <ContextField label="Customer" value={context.customerId} />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          disabled={completing}
          onClick={() => onComplete("APPROVE")}
        >
          <Check className="size-4" />
          Duyệt
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={completing}
          onClick={() => onComplete("REQUEST_CHANGES")}
        >
          <RotateCcw className="size-4" />
          Bổ sung
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={completing}
          onClick={() => onComplete("REJECT")}
        >
          <X className="size-4" />
          Từ chối
        </Button>
      </div>
    </Panel>
  )
}
