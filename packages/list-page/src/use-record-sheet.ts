import { useCallback, useMemo, useState } from "react"
import type { Row, Table } from "@tanstack/react-table"

type Identified = { id?: string | number }

const defaultKey = <TData,>(row: Row<TData>) =>
  String((row.original as Identified).id ?? row.id)

/**
 * State for a RecordSheet over a list page: which record is open, and
 * previous/next within the rows currently on screen. The record is tracked
 * by its own id, so a refetch or page change never swaps it for another
 * row; if it leaves the page the sheet closes.
 */
export function useRecordSheet<TData>(
  table: Table<TData>,
  getKey: (row: Row<TData>) => string = defaultKey
) {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const rows = table.getRowModel().rows
  const index = activeKey === null ? -1 : rows.findIndex((row) => getKey(row) === activeKey)
  const row = index >= 0 ? rows[index] : undefined

  const openRow = useCallback((next: Row<TData>) => setActiveKey(getKey(next)), [getKey])
  const close = useCallback(() => setActiveKey(null), [])
  const prev = index > 0 ? rows[index - 1] : undefined
  const next = index >= 0 && index < rows.length - 1 ? rows[index + 1] : undefined

  return useMemo(
    () => ({
      open: Boolean(row),
      record: row?.original,
      /** For DataTable `activeRowId` (TanStack row id, not the record id). */
      activeRowId: row?.id,
      openRow,
      close,
      onOpenChange: (open: boolean) => {
        if (!open) close()
      },
      onPrev: prev ? () => setActiveKey(getKey(prev)) : undefined,
      onNext: next ? () => setActiveKey(getKey(next)) : undefined,
      position: row ? `${index + 1} / ${rows.length}` : undefined,
    }),
    [row, openRow, close, prev, next, getKey, index, rows.length]
  )
}
