"use client"

import { cn } from "@workspace/ui/lib/utils"

type DataTableKeyCellProps = {
  children: React.ReactNode
  onActivate: () => void
  className?: string
}

export function DataTableKeyCell({
  children,
  onActivate,
  className,
}: DataTableKeyCellProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        onActivate()
      }}
      className={cn(
        "max-w-full truncate text-left font-medium text-foreground",
        "underline-offset-2 hover:text-primary hover:underline",
        "rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className
      )}
    >
      {children}
    </button>
  )
}
