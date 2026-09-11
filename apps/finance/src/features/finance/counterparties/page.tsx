import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { matchTextColumnFilter } from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { counterpartyApi, type Counterparty } from "../api"
import { CounterpartyDialog } from "./components/CounterpartyDialog"

/** Counterparty master (TK đối tác) — catalog + accounts. */
export function CounterpartiesPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<Counterparty[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Counterparty | null>(null)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    setLoadError(null)
    try {
      const result = await counterpartyApi.list({ include_inactive: true })
      setItems(result.items)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  const columns: ColumnDef<Counterparty>[] = [
    {
      id: "code",
      accessorKey: "code",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("common.field.code")} />,
      enableColumnFilter: true,
      cell: ({ row }) => <span className="font-mono text-xs font-semibold text-primary">{row.original.code}</span>,
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("common.field.name")} />,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: "party_type",
      accessorKey: "party_type",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label={t("finance.counterparties.field.party_type")} />
      ),
    },
    {
      id: "is_active",
      accessorKey: "is_active",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("common.field.status")} />,
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? "default" : "outline"}>
          {row.original.is_active
            ? t("finance.counterparties.active")
            : t("finance.counterparties.inactive")}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("common.field.action")}</div>,
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => setEditTarget(row.original)}
          >
            {t("common.action.edit")}
          </button>
        </div>
      ),
    },
  ]

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
      }),
    defaultPageSize: 10,
  })

  return (
    <ListPageShell
      title={t("finance.counterparties.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("finance.counterparties.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(true)}
      fetching={false}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("finance.counterparties.create")}
          exportFilename={t("finance.counterparties.title")}
          sheetName={t("finance.counterparties.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <CounterpartyDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            counterparty={null}
            onSaved={() => load()}
          />
          <CounterpartyDialog
            open={editTarget !== null}
            onOpenChange={(next) => !next && setEditTarget(null)}
            counterparty={editTarget}
            onSaved={() => load()}
          />
        </>
      }
    />
  )
}

