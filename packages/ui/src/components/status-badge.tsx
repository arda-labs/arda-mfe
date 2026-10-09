import type { HTMLAttributes } from "react"

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: string
  label?: string
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "destructive" | "info"
}

/** Shared status pill. Callers own domain-specific label and color policy. */
export function StatusBadge({
  status,
  label,
  variant,
  className = "",
  ...props
}: StatusBadgeProps) {
  const resolvedVariant =
    variant ?? (status === "ACTIVE" || status === "COMPLETED" ? "secondary" : "outline")
  const styles: Record<NonNullable<StatusBadgeProps["variant"]>, string> = {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    outline: "text-foreground",
    success: "border-success/20 bg-success/10 text-success",
    warning: "border-warning/25 bg-warning/15 text-warning",
    destructive: "border-transparent bg-destructive text-destructive-foreground",
    info: "border-info/20 bg-info/10 text-info",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${styles[resolvedVariant]} ${className}`.trim()}
      {...props}
    >
      {label ?? status}
    </span>
  )
}
