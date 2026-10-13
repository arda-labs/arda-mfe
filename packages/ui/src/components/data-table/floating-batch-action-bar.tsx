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
      aria-label={t("batch_actions.selected_count", { count: selectedCount })}
      className={cn(
        // Dark pill (design board 12.2): reads as a mode, not another card.
        // The `dark` class scopes the dark tokens to the bar in both themes.
        "dark fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-background py-1.5 pr-1.5 pl-4 text-sm text-foreground shadow-dialog transition-all duration-200 animate-in fade-in slide-in-from-bottom-4",
        className
      )}
      {...props}
    >
      <span className="font-medium whitespace-nowrap">
        {t("batch_actions.selected_count", { count: selectedCount })}
      </span>

      <div className="flex items-center gap-2">
        {children}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleClear}
        className="size-8 rounded-full text-white/70 hover:bg-white/10 hover:text-white"
        title={t("batch_actions.clear_selection")}
        aria-label={t("batch_actions.clear_selection")}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}
