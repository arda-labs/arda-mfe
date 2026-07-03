import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  badge,
}: {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
  badge?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          {Icon ? <Icon className="size-5 text-muted-foreground" /> : null}
          <h1 className="text-2xl font-semibold text-balance">{title}</h1>
          {badge}
        </div>
        {description ? (
          <p className="text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
