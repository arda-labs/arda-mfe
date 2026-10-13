"use client"

import type { Column } from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { useI18n } from "@workspace/i18n"

interface DataTableColumnHeaderProps<
  TData,
  TValue,
> extends React.ComponentProps<"button"> {
  column: Column<TData, TValue>
  label: string
}

/**
 * Column header (DataTable v2, design board 16): the label sorts on click and
 * the arrow only shows while hovered, focused or sorted. Hiding columns moved
 * to the toolbar's "Cột" menu, so headers no longer carry a "⋯" button each.
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  label,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  const { t } = useI18n()
  const sorted = column.getIsSorted()

  if (!column.getCanSort()) {
    return (
      <span
        className={cn("truncate text-xs font-semibold text-muted-foreground", className)}
      >
        {label}
      </span>
    )
  }

  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown
  const sortLabel =
    sorted === "asc"
      ? t("common.table.sort_ascending")
      : sorted === "desc"
        ? t("common.table.sort_descending")
        : undefined

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(undefined, false)}
      aria-sort={
        sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined
      }
      title={sortLabel}
      className={cn(
        "group/sort -ml-1.5 inline-flex h-7 max-w-full items-center gap-1 rounded-md px-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none",
        sorted && "text-foreground",
        className
      )}
      {...props}
    >
      <span className="truncate">{label}</span>
      <Icon
        aria-hidden
        className={cn(
          "size-3.5 shrink-0 transition-opacity",
          sorted
            ? "opacity-100"
            : "opacity-0 group-hover/sort:opacity-60 group-focus-visible/sort:opacity-60"
        )}
      />
    </button>
  )
}
