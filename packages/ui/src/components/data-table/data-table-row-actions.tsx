"use client"

import { Edit2, Trash2 } from "lucide-react"

import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

type DataTableRowActionsProps = {
  onEdit?: () => void
  onDelete?: () => void
  editTitle?: string
  deleteTitle?: string
  className?: string
}

export function DataTableRowActions({
  onEdit,
  onDelete,
  editTitle,
  deleteTitle,
  className,
}: DataTableRowActionsProps) {
  const { t } = useI18n()

  const resolvedEditTitle = editTitle || t("action.edit") || "Edit"
  const resolvedDeleteTitle = deleteTitle || t("action.delete") || "Delete"

  return (
    <div
      className={cn("flex items-center justify-end gap-0.5", className)}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {onEdit ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-foreground"
          title={resolvedEditTitle}
          aria-label={resolvedEditTitle}
          onClick={onEdit}
        >
          <Edit2 className="size-3.5" />
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
          title={resolvedDeleteTitle}
          aria-label={resolvedDeleteTitle}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </div>
  )
}
