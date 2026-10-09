import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

type DetailFooterBarProps = {
  /** When true the bar shows `dirtyLabel` so unsaved edits are never silent. */
  dirty?: boolean
  dirtyLabel?: string
  className?: string
  /** Action buttons, rendered right-aligned (Cancel, Save, Submit...). */
  children: ReactNode
}

/** Sticky bottom action bar for edit/create mode of a detail page. */
export function DetailFooterBar({
  dirty = false,
  dirtyLabel,
  className,
  children,
}: DetailFooterBarProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur sm:px-6",
        className
      )}
    >
      <p
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        {dirty && dirtyLabel ? (
          <>
            <span className="size-1.5 rounded-full bg-warning" aria-hidden />
            {dirtyLabel}
          </>
        ) : null}
      </p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}
