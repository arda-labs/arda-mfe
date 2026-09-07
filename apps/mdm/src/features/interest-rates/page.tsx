import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  activeStatusMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { Edit2, Layers } from "lucide-react"
import { interestRateApi, type InterestRate } from "../api"
import { interestRatesListDefinition } from "./list-query"
import { InterestRateDialog } from "./components/InterestRateDialog"
import { TierEditorDialog } from "./components/TierEditorDialog"

const rateTypeMeta: Record<
  string,
  { labelKey: string; variant: "default" | "secondary" | "outline" }
> = {
  central: { labelKey: "mdm.interest_rates.rate_type.central", variant: "default" },
  loan: { labelKey: "mdm.interest_rates.rate_type.loan", variant: "secondary" },
  deposit: { labelKey: "mdm.interest_rates.rate_type.deposit", variant: "outline" },
}

export function InterestRatesPage(_props: { pathname: string }) {
  const { t, formatDate } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<InterestRate | null>(null)
  const [tierTarget, setTierTarget] = useState<InterestRate | null>(null)

  const columns = useMemo<ColumnDef<InterestRate>[]>(
    () => [
      {
        id: "code",
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
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.interest_rates.field.name")} />
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        id: "rate_type",
        accessorKey: "rate_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.interest_rates.field.rate_type")} />
        ),
        enableSorting: false,
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
        id: "apply_type",
        accessorKey: "apply_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("mdm.interest_rates.field.apply_type")} />
        ),
        enableSorting: false,
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
        enableSorting: false,
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
        enableSorting: false,
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
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.created")} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {row.original.created_at ? formatDate(row.original.created_at) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("mdm.interest_rates.field.actions")}</div>
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => setTierTarget(row.original)}
            >
              <Layers className="size-3.5" />
              {t("mdm.interest_rates.tiers.manage")}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground"
              onClick={() => {
                setEditing(row.original)
                setDialogOpen(true)
              }}
              title={t("common.action.edit")}
            >
              <Edit2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [formatDate, t]
  )

  /**
   * Server-driven list controller: URL page/perPage + `code`→q + `is_active`
   * filters <-> TanStack Query cache. Rate-level delete does not exist on the
   * BE — only tier values inside TierEditorDialog are deletable.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<InterestRate>({
    ...interestRatesListDefinition,
    columns,
    queryFn: async (query) =>
      interestRateApi.list(true, {
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        is_active:
          query.is_active === undefined ? undefined : String(query.is_active),
        sort: query.sort,
        order: query.order,
      }),
  })

  return (
    <ListPageShell
      title={t("mdm.interest_rates.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("mdm.interest_rates.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("mdm.interest_rates.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => {
            setEditing(null)
            setDialogOpen(true)
          }}
          createLabel={t("mdm.interest_rates.create")}
          exportFilename={t("mdm.interest_rates.title")}
          sheetName={t("mdm.interest_rates.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <InterestRateDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            editing={editing}
            onSaved={async () => {
              await refetch()
            }}
          />

          <TierEditorDialog
            rate={tierTarget}
            open={Boolean(tierTarget)}
            onOpenChange={(open) => !open && setTierTarget(null)}
          />
        </>
      }
    />
  )
}
