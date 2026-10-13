import { Check, Clock3, Undo2, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"

export type TrailStepState = "done" | "current" | "todo" | "rejected" | "returned"

export type TrailStep = {
  id: string
  label: string
  state: TrailStepState
  /** Who did it (or holds it now, for the current step). */
  actor?: string
  /** ISO timestamp of the event that set this state. */
  at?: string
  /** Reviewer comment: approval note, rejection or change request reason. */
  note?: string
}

const ICON = {
  done: Check,
  current: Clock3,
  todo: null,
  rejected: X,
  returned: Undo2,
} as const

const DOT: Record<TrailStepState, string> = {
  done: "border-success bg-success text-success-foreground",
  current: "border-primary bg-primary/10 text-primary",
  todo: "border-border bg-background text-muted-foreground",
  rejected: "border-destructive bg-destructive text-destructive-foreground",
  returned: "border-warning bg-warning/15 text-warning-ink",
}

/**
 * Maker → checker → completion with who and when (design board 09): the
 * answer to "who is this waiting on" plus the reviewer's words, without
 * opening the full activity log.
 */
export function ApprovalTrail({
  steps,
  label,
  className,
}: {
  steps: TrailStep[]
  /** Accessible name, e.g. "Luồng phê duyệt". */
  label: string
  className?: string
}) {
  const { t, formatDate } = useI18n()
  return (
    <ol aria-label={label} data-slot="approval-trail" className={cn("space-y-0", className)}>
      {steps.map((step, index) => {
        const Icon = ICON[step.state]
        const last = index === steps.length - 1
        return (
          <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
            {last ? null : (
              <span
                aria-hidden
                className={cn(
                  "absolute top-6 bottom-0 left-[11px] w-px",
                  step.state === "done" ? "bg-success/40" : "bg-border"
                )}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
                DOT[step.state]
              )}
            >
              {Icon ? <Icon className="size-3.5" strokeWidth={2.5} /> : null}
            </span>
            <div
              className="min-w-0 flex-1 pt-0.5"
              aria-current={step.state === "current" ? "step" : undefined}
            >
              <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span
                  className={cn(
                    "font-medium",
                    step.state === "todo" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`common.approval.state.${step.state}`)}
                </span>
              </div>
              {step.actor || step.at ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {[step.actor, step.at ? formatDate(step.at, { dateStyle: "short", timeStyle: "short" }) : undefined]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              {step.note ? (
                <blockquote className="mt-1.5 rounded-md border-l-2 border-border bg-muted/50 px-2.5 py-1.5 text-xs text-foreground">
                  {step.note}
                </blockquote>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
