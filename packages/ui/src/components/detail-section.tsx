import type { ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

type DetailSectionProps = {
  /** Anchor id; also used by DetailPageShell's section navigation. */
  id: string
  title: string
  description?: ReactNode
  /** Right-aligned controls (e.g. an "Edit" or "Manage" button). */
  actions?: ReactNode
  className?: string
  children: ReactNode
}

/** A titled card that groups related fields inside a detail page. */
export function DetailSection({
  id,
  title,
  description,
  actions,
  className,
  children,
}: DetailSectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-24 rounded-lg border bg-card", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="min-w-0 space-y-0.5">
          <h2 id={`${id}-title`} className="text-sm font-semibold">
            {title}
          </h2>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}
