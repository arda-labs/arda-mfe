import type { ReactNode } from "react"
import { Check, CircleAlert, X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"

export type ChecklistState = "ok" | "error" | "warning"

export type ChecklistItem = {
  id: string
  label: ReactNode
  state: ChecklistState
  /** What to fix, shown under a failing item. */
  hint?: ReactNode
}

/** Errors block submission; warnings only inform. */
export function hasBlockingIssue(items: Pick<ChecklistItem, "state">[]) {
  return items.some((item) => item.state === "error")
}

const ICON = { ok: Check, error: X, warning: CircleAlert } as const
const TONE: Record<ChecklistState, string> = {
  ok: "bg-success/10 text-success",
  error: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning-ink",
}

/**
 * What must be true before "Gửi duyệt" (design board 09): every check at
 * once instead of one toast per failed submit. Errors disable the submit
 * button; warnings (no attachment, no description) are allowed through.
 */
export function PreSubmitChecklist({
  items,
  title,
  className,
}: {
  items: ChecklistItem[]
  title?: ReactNode
  className?: string
}) {
  const { t } = useI18n()
  const passed = items.filter((item) => item.state === "ok").length
  const blocking = hasBlockingIssue(items)

  return (
    <section
      data-slot="pre-submit-checklist"
      aria-label={typeof title === "string" ? title : t("common.checklist.title")}
      className={cn("rounded-xl border bg-card p-3", className)}
    >
      <header className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title ?? t("common.checklist.title")}
        </h3>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
            blocking ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
          )}
        >
          {t("common.checklist.passed", { passed, total: items.length })}
        </span>
      </header>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const Icon = ICON[item.state]
          return (
            <li key={item.id} className="flex gap-2 text-sm" data-state={item.state}>
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full",
                  TONE[item.state]
                )}
              >
                <Icon className="size-3" strokeWidth={3} />
              </span>
              <div className="min-w-0">
                <span className={cn(item.state === "ok" && "text-muted-foreground")}>
                  {item.label}
                </span>
                {item.hint && item.state !== "ok" ? (
                  <p className="text-xs text-muted-foreground">{item.hint}</p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
