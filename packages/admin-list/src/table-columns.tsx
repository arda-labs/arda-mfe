"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTableRowActions } from "@workspace/ui/components/data-table/data-table-row-actions"
import {
  ACTIONS_COLUMN_ID,
  ACTIONS_COLUMN_SIZE,
  fixedColumnSize,
} from "@workspace/ui/lib/inject-row-index-column"

type CreateActionsColumnOptions<T> = {
  onEdit?: (row: T) => void
  onDelete?: (row: T) => void
  editTitle?: string
  deleteTitle?: string
  headerLabel?: string
}

export function createActionsColumn<T>({
  onEdit,
  onDelete,
  editTitle,
  deleteTitle,
  headerLabel,
}: CreateActionsColumnOptions<T>): ColumnDef<T> {
  return {
    id: ACTIONS_COLUMN_ID,
    header: () =>
      headerLabel ? (
        <div className="text-right text-xs font-bold text-foreground">
          {headerLabel}
        </div>
      ) : (
        <span className="sr-only">Actions</span>
      ),
    cell: ({ row }) => (
      <DataTableRowActions
        onEdit={onEdit ? () => onEdit(row.original) : undefined}
        onDelete={onDelete ? () => onDelete(row.original) : undefined}
        editTitle={editTitle}
        deleteTitle={deleteTitle}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    ...fixedColumnSize(ACTIONS_COLUMN_SIZE),
  }
}
