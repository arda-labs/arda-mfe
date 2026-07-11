import type { ReactNode } from "react"
import type { Table } from "@tanstack/react-table"
import { Download, Plus } from "lucide-react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { DataTableToolbar } from "@workspace/ui/components/data-table/data-table-toolbar"

type ListTableToolbarProps<TData> = {
  table: Table<TData>
  onCreate?: () => void
  createLabel?: string
  children?: ReactNode
}

export function ListTableToolbar<TData>({
  table,
  onCreate,
  createLabel,
  children,
}: ListTableToolbarProps<TData>) {
  const { t } = useI18n()

  return (
    <DataTableToolbar table={table}>
      {children}
      {onCreate && createLabel ? (
        <Button onClick={onCreate} className="h-8 px-3 text-xs font-semibold">
          <Plus className="mr-1 size-3.5" />
          {createLabel}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        className="h-8 px-3 text-xs font-semibold"
        onClick={() => {
          // Placeholder — export wiring comes later.
        }}
      >
        <Download className="mr-1 size-3.5" />
        {t("common.action.export_excel")}
      </Button>
    </DataTableToolbar>
  )
}
