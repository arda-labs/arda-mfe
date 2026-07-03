import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

export function PageFilters({
  cols = "md:grid-cols-[1fr_1fr_12rem]",
  className,
  children,
}: {
  cols?: string
  className?: string
  children: ReactNode
}) {
  return <div className={cn("grid gap-3", cols, className)}>{children}</div>
}
