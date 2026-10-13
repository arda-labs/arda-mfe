import { Check } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

export type LifecycleStep = {
  id: string
  label: string
  state: "done" | "current" | "todo"
  /** Short context: a date, "2/3 đợt", the person it waits on. */
  meta?: string
}

/**
 * Where a document or contract stands (design boards 05/12.3): maker →
 * checker → posted, or signing → disbursement → repayment → settlement.
 * Answers "who is it waiting on" without opening the audit trail.
 */
export function LifecycleSteps({
  steps,
  label,
  className,
}: {
  steps: LifecycleStep[]
  /** Accessible name, e.g. "Vòng đời hợp đồng". */
  label: string
  className?: string
}) {
  return (
    <ol
      aria-label={label}
      className={cn("flex flex-wrap items-center gap-1.5 text-xs", className)}
    >
      {steps.map((step, index) => (
        <li key={step.id} className="flex items-center gap-1.5">
          {index > 0 ? (
            <span aria-hidden className="h-px w-3 bg-border" />
          ) : null}
          <span
            aria-current={step.state === "current" ? "step" : undefined}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2.5 font-medium whitespace-nowrap",
              step.state === "done" && "bg-accent text-accent-foreground",
              step.state === "current" && "bg-primary text-primary-foreground",
              step.state === "todo" && "bg-muted text-muted-foreground"
            )}
          >
            {step.state === "done" ? (
              <Check aria-hidden className="size-3" />
            ) : null}
            {step.label}
            {step.meta ? (
              <span
                className={cn(
                  "font-normal",
                  step.state === "current" ? "opacity-85" : "opacity-75"
                )}
              >
                · {step.meta}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  )
}
