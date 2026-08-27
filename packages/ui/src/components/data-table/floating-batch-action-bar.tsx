import * as React from "react"
import type { Table } from "@tanstack/react-table"
import { X } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

export interface FloatingBatchActionBarProps<TData>
  extends React.HTMLAttributes<HTMLDivElement> {
  table: Table<TData>
  children?: React.ReactNode
  onClearSelection?: () => void
}

export function FloatingBatchActionBar<TData>({
  table,
  children,
  className,
  onClearSelection,
  ...props
}: FloatingBatchActionBarProps<TData>) {
  const { t } = useI18n()
  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length

  if (selectedCount === 0) return null

  const handleClear = () => {
    if (onClearSelection) {
      onClearSelection()
    } else {
      table.resetRowSelection()
    }
  }

  return (
    <div
      role="region"
      aria-label="Batch actions toolbar"
      className={cn(
        "fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border/80 bg-background/95 px-4 py-2 shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-4",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 pr-2 border-r border-border/60">
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {selectedCount}
        </span>
        <span className="text-xs font-medium text-foreground whitespace-nowrap">
          {t("batch_actions.selected_count", { count: selectedCount })}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {children}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleClear}
        className="size-7 rounded-full text-muted-foreground hover:text-foreground"
        title={t("batch_actions.clear_selection")}
        aria-label={t("batch_actions.clear_selection")}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
