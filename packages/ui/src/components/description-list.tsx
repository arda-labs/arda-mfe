import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

export type DescriptionItem = {
  label: string
  value?: ReactNode
  /** Span the full row (long text such as addresses). */
  wide?: boolean
}

type DescriptionListProps = {
  items: DescriptionItem[]
  /** Columns from the `lg` breakpoint up; always one column on small screens. */
  columns?: 2 | 3
  className?: string
}

function isEmpty(value: ReactNode) {
  return value === undefined || value === null || value === ""
}

/** Read-only label/value grid for the "view" mode of a detail page. */
export function DescriptionList({
  items,
  columns = 2,
  className,
}: DescriptionListProps) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 gap-x-8 gap-y-4",
        columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
        className
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn("min-w-0 space-y-1", item.wide && "lg:col-span-full")}
        >
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="break-words text-sm">
            {isEmpty(item.value) ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
