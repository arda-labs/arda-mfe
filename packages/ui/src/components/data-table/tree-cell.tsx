import type { ReactNode } from "react"
import type { Row } from "@tanstack/react-table"
import { ChevronRight } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"

/**
 * First cell of a tree row (design board 09, TreeTable): indent by depth, a
 * chevron to fold the branch and the number of direct children.
 */
export function TreeCell<TData>({
  row,
  children,
  className,
}: {
  row: Row<TData>
  children: ReactNode
  className?: string
}) {
  const { t } = useI18n()
  const canExpand = row.getCanExpand()
  const expanded = row.getIsExpanded()
  const childCount = row.subRows.length

  return (
    <div
      className={cn("flex min-w-0 items-center gap-1", className)}
      style={{ paddingLeft: `${row.depth * 1.25}rem` }}
    >
      {canExpand ? (
        <button
          type="button"
          onClick={row.getToggleExpandedHandler()}
          aria-expanded={expanded}
          aria-label={t(expanded ? "common.tree.collapse" : "common.tree.expand")}
          className="-ml-1 flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronRight
            aria-hidden
            className={cn("size-4 transition-transform", expanded && "rotate-90")}
          />
        </button>
      ) : (
        <span aria-hidden className="-ml-1 size-6 shrink-0" />
      )}
      <span className="min-w-0 truncate">{children}</span>
      {canExpand && !expanded ? (
        <span className="shrink-0 rounded-full bg-muted px-1.5 text-[11px] leading-4 text-muted-foreground tabular-nums">
          {childCount}
        </span>
      ) : null}
    </div>
  )
}
