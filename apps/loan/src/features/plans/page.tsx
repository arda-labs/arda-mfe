import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  matchSelectFilter,
  matchTextColumnFilter,
  selectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { formatAmount, formatDateShort, fromMinor } from "@workspace/format"
import { loanPlanApi, type LoanPlan } from "../api"
import { PlanForm } from "./components/PlanForm"

const DEFAULT_PAGE_SIZE = 10
const STATUS_FILTER_OPTIONS = ["ACTIVE", "CLOSED", "CANCELLED"]

const STATUS_LABEL_KEYS: Record<string, string> = {
  DRAFT: "loan.status.draft",
  PENDING: "loan.status.pending",
  ACTIVE: "loan.status.active",
  INACTIVE: "loan.status_inactive",
  CLOSED: "loan.status.closed",
  CANCELLED: "loan.status.cancelled",
}

function statusVariant(status: string) {
  if (status === "ACTIVE") return "default" as const
  if (status === "CANCELLED") return "destructive" as const
  return "outline" as const
}

function statusLabel(status: string, t: (key: string) => string) {
  const key = STATUS_LABEL_KEYS[status]
  return key ? t(key) : status
}

/**
 * Loan plan catalog (W7). `GET /api/loan/plans` returns the whole catalog
 * (`all=true`), so this is a client-tier list: search/sort/paging run in
 * memory behind the shared DataTable, URL-synced via useClientListTable.
 * Create/edit lives in the PlanForm dialog; closing a plan stays a row action.
 */
export function PlansPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<LoanPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<LoanPlan | null>(null)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await loanPlanApi.list()
      setItems(result.items)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  const closePlan = useCallback(
    async (plan: LoanPlan) => {
      try {
        await loanPlanApi.close(plan.id)
        await load()
      } catch {
        notify.error(t("loan.plans.save_failed"))
      }
    },
    [load, t]
  )

  const columns = useMemo<ColumnDef<LoanPlan>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("common.field.code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.code}
          </span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.name")} />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "from_date",
        accessorKey: "from_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.plans.field.from_date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.from_date ? formatDateShort(row.original.from_date) : "—"}
          </span>
        ),
      },
      {
        id: "to_date",
        accessorKey: "to_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.plans.field.to_date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.to_date ? formatDateShort(row.original.to_date) : "—"}
          </span>
        ),
      },
      {
        id: "target_amount_minor",
        accessorKey: "target_amount_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.plans.field.target")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatAmount(fromMinor(row.original.target_amount_minor, "VND"), "VND")}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("common.field.status")} />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("common.field.status"),
          STATUS_FILTER_OPTIONS.map((status) => ({
            value: status,
            label: t(STATUS_LABEL_KEYS[status]),
          }))
        ),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {statusLabel(row.original.status, t)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => {
                setEditTarget(row.original)
                setFormOpen(true)
              }}
            >
              {t("common.action.edit")}
            </button>
            {row.original.status === "ACTIVE" ? (
              <button
                type="button"
                className="text-xs font-semibold text-destructive hover:underline"
                onClick={() => void closePlan(row.original)}
              >
                {t("loan.plans.close")}
              </button>
            ) : null}
          </div>
        ),
      },
    ],
    [closePlan, t]
  )

  const { table, total } = useClientListTable<LoanPlan>({
    columns,
    items,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code, item.name),
      status: (item, value) => matchSelectFilter(item.status, value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        from_date: (a, b) => (a.from_date ?? "").localeCompare(b.from_date ?? ""),
        to_date: (a, b) => (a.to_date ?? "").localeCompare(b.to_date ?? ""),
        target_amount_minor: (a, b) =>
          a.target_amount_minor - b.target_amount_minor,
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("loan.plans.title")}
      header={
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("loan.plans.description")}
        </p>
      }
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("loan.count_badge", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(true)}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => {
            setEditTarget(null)
            setFormOpen(true)
          }}
          createLabel={t("loan.plans.create")}
          exportFilename={t("loan.plans.title")}
          sheetName={t("loan.plans.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <PlanForm
          open={formOpen}
          onOpenChange={setFormOpen}
          plan={editTarget}
          onSaved={() => load()}
        />
      }
    />
  )
}
