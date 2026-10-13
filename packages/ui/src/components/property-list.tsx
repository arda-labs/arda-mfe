import type { ReactNode } from "react"
import { cn } from "@workspace/ui/lib/utils"

export type PropertyItem = {
  label: string
  value?: ReactNode
}

/**
 * Compact label/value rows for a detail page's side panel (design board
 * 12.3, Linear-style properties). DescriptionList stays the wide grid for
 * the main column.
 */
export function PropertyList({
  title,
  items,
  className,
}: {
  title?: string
  items: PropertyItem[]
  className?: string
}) {
  return (
    <section className={cn("space-y-2", className)}>
      {title ? (
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
      ) : null}
      <dl className="space-y-1.5">
        {items.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 text-sm"
          >
            <dt className="truncate text-muted-foreground">{item.label}</dt>
            <dd className="min-w-0 break-words">
              {item.value === undefined || item.value === null || item.value === "" ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                item.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
