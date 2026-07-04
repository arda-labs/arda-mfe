import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

type PageHeaderProps = {
  title: string
  icon?: LucideIcon
  description?: React.ReactNode
  meta?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function PageHeader({
  title,
  icon: Icon,
  description,
  meta,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-start justify-between gap-3",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {Icon ? (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </div>
          ) : null}
          <h1 className="truncate text-xl font-semibold">{title}</h1>
          {meta}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  )
}
