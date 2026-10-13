import type { HTMLAttributes, ReactNode } from "react"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
import { statusTone, type StatusTone } from "@workspace/ui/lib/status-tone"

export { statusTone, type StatusTone }

const TONE_CLASS: Record<StatusTone, string> = {
  neutral: "border-transparent bg-muted text-muted-foreground [--dot:var(--muted-foreground)]",
  info: "border-info/20 bg-info/10 text-info [--dot:var(--info)]",
  pending: "border-warning/30 bg-warning/15 text-warning-ink [--dot:var(--warning)]",
  success: "border-success/20 bg-success/10 text-success [--dot:var(--success)]",
  posted: "border-posted/20 bg-posted/10 text-posted [--dot:var(--posted)]",
  danger: "border-destructive/20 bg-destructive/10 text-destructive [--dot:var(--destructive)]",
}

export interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Backend status code; picks the tone and, without children, the label. */
  status?: string | null
  /** Overrides the tone derived from `status`. */
  tone?: StatusTone
  /** Leading dot (default on). */
  dot?: boolean
  /** Label; defaults to `common.status.<code>` or the raw code. */
  children?: ReactNode
}

/**
 * The one status pill. Badge stays for labels and counts; anything that
 * says where a record stands in its lifecycle uses StatusBadge.
 */
export function StatusBadge({
  status,
  tone,
  dot = true,
  className,
  children,
  ...props
}: StatusBadgeProps) {
  const { t } = useI18n()
  const resolved = tone ?? statusTone(status)
  let label = children
  if (label === undefined || label === null) {
    const key = `common.status.${(status ?? "").trim().toLowerCase()}`
    const translated = status ? t(key) : ""
    label = translated && translated !== key ? translated : status
  }
  return (
    <span
      data-slot="status-badge"
      data-tone={resolved}
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs leading-4 font-medium whitespace-nowrap",
        TONE_CLASS[resolved],
        className
      )}
      {...props}
    >
      {dot ? (
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-(--dot)" />
      ) : null}
      {label}
    </span>
  )
}
