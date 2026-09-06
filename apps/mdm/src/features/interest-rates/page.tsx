import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  activeStatusMeta,
  matchBooleanActiveFilter,
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { Edit2, Layers, Plus } from "lucide-react"
import { interestRateApi, type InterestRate } from "../api"
import { InterestRateDialog } from "./components/InterestRateDialog"
import { TierEditorDialog } from "./components/TierEditorDialog"

const DEFAULT_PAGE_SIZE = 10

const rateTypeMeta: Record<
  string,
  { labelKey: string; variant: "default" | "secondary" | "outline" }
> = {
  central: { labelKey: "mdm.interest_rates.rate_type.central", variant: "default" },
  loan: { labelKey: "mdm.interest_rates.rate_type.loan", variant: "secondary" },
  deposit: { labelKey: "mdm.interest_rates.rate_type.deposit", variant: "outline" },
}

export function InterestRatesPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [rates, setRates] = useState<InterestRate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InterestRate | null>(null)
  const [tierTarget, setTierTarget] = useState<InterestRate | null>(null)

  const loadRates = useCallback(async () => {
    setLoading(true)
    try {
      const result = await interestRateApi.list(true)
      setRates(result.items)
    } catch (error) {
      notify.error(translateApiError(error, t("mdm.interest_rates.load_failed")))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadRates()
  }, [loadRates])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const columns = useMemo<ColumnDef<InterestRate>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.interest_rates.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("mdm.interest_rates.field.code"),
          t("mdm.interest_rates.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.code}</span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.interest_rates.field.name")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("mdm.interest_rates.field.name"),
          t("mdm.interest_rates.placeholder.search")
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "rate_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.interest_rates.field.rate_type")} />
        ),
        cell: ({ row }) => {
          const meta = rateTypeMeta[row.original.rate_type]
          return meta ? (
            <Badge variant={meta.variant}>{t(meta.labelKey)}</Badge>
          ) : (
            <span className="font-mono text-xs">{row.original.rate_type}</span>
          )
        },
      },
      {
        accessorKey: "apply_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.interest_rates.field.apply_type")} />
        ),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {t(`mdm.interest_rates.apply_type.${row.original.apply_type}`)}
          </span>
        ),
      },
      {
        id: "currency",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.interest_rates.field.currency")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.currency_code || "—"}
          </span>
        ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.interest_rates.field.status")} />
        ),
        enableColumnFilter: true,
        meta: activeStatusMeta(
          t("mdm.interest_rates.field.status"),
          t("mdm.status.active"),
          t("mdm.status.inactive")
        ),
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "outline"}>
            {row.original.is_active
              ? t("mdm.status.active")
              : t("mdm.status.inactive")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: t("mdm.interest_rates.field.actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setTierTarget(row.original)}
            >
              <Layers className="size-3.5" />
              {t("mdm.interest_rates.tiers.manage")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => {
                setEditing(row.original)
                setDialogOpen(true)
              }}
            >
              <Edit2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items: rates,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code),
      name: (item, value) => matchTextColumnFilter(value, item.name),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      <PageHeader
        title={t("mdm.interest_rates.title")}
        description={t("mdm.interest_rates.description")}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            {t("mdm.interest_rates.create")}
          </Button>
        }
      />

      <div className="relative min-h-0 flex-1">
        {loading ? (
          <DataTableSkeleton columnCount={7} rowCount={6} />
        ) : (
          <DataTable table={table} totalRows={total} className="min-h-0 flex-1">
            <ListTableToolbar
              table={table}
              onCreate={openCreate}
              createLabel={t("mdm.interest_rates.create")}
            />
          </DataTable>
        )}
      </div>

      <InterestRateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={loadRates}
      />

      <TierEditorDialog
        rate={tierTarget}
        open={Boolean(tierTarget)}
        onOpenChange={(open) => !open && setTierTarget(null)}
      />
    </section>
  )
}
