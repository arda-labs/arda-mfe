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
import { matchTextColumnFilter, textSearchMeta } from "@workspace/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { formatMoney } from "@workspace/format"
import { Plus } from "lucide-react"
import { vfuApi, type VfuMandate, type VfuParty, type VfuPlan } from "../api"
import { VfuCreateDialog, type VfuDialogTarget } from "./components/VfuCreateDialog"

const DEFAULT_PAGE_SIZE = 10

export function VfuPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [parties, setParties] = useState<VfuParty[]>([])
  const [mandates, setMandates] = useState<VfuMandate[]>([])
  const [plans, setPlans] = useState<VfuPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogTarget, setDialogTarget] = useState<VfuDialogTarget>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [p, m, pl] = await Promise.all([
        vfuApi.listParties(),
        vfuApi.listMandates(),
        vfuApi.listPlans(),
      ])
      setParties(p.items)
      setMandates(m.items)
      setPlans(pl.items)
    } catch (error) {
      notify.error(translateApiError(error, t("loan_vfu.load_failed")))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const partyColumns = useMemo<ColumnDef<VfuParty>[]>(
    () => [
      {
        accessorKey: "party_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.party_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan_vfu.field.party_code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.party_code}</span>
        ),
      },
      {
        accessorKey: "party_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.party_name")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan_vfu.field.party_name"), t("loan.placeholder.search")),
        cell: ({ row }) => <span className="font-medium">{row.original.party_name}</span>,
      },
      {
        accessorKey: "mobile_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.phone")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.mobile_number || "—"}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: t("loan.field.status"),
        cell: ({ row }) => (
          <Badge variant={row.original.status === "ACTIVE" ? "default" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [t]
  )

  const mandateColumns = useMemo<ColumnDef<VfuMandate>[]>(
    () => [
      {
        accessorKey: "mandate_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.mandate_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan_vfu.field.mandate_code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.mandate_code}</span>
        ),
      },
      {
        accessorKey: "party_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.party_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan_vfu.field.party_code"), t("loan.placeholder.search")),
      },
      {
        accessorKey: "rate_value",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.rate")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.rate_value ?? "—"}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: t("loan.field.status"),
        cell: ({ row }) => (
          <Badge variant={row.original.status === "ACTIVE" ? "default" : "outline"}>
            {row.original.status}
          </Badge>
        ),
      },
    ],
    [t]
  )

  const planColumns = useMemo<ColumnDef<VfuPlan>[]>(
    () => [
      {
        accessorKey: "plan_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.plan_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan_vfu.field.plan_code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.plan_code}</span>
        ),
      },
      {
        accessorKey: "mandate_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.mandate_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan_vfu.field.mandate_code"), t("loan.placeholder.search")),
      },
      {
        accessorKey: "allocated_amt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.allocated")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(row.original.allocated_amt)}</span>
        ),
      },
      {
        accessorKey: "settled_amt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.settled")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(row.original.settled_amt)}</span>
        ),
      },
      {
        accessorKey: "fee_amt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan_vfu.field.fee")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(row.original.fee_amt)}</span>
        ),
      },
    ],
    [t]
  )

  const partyTable = useClientListTable({
    columns: partyColumns,
    items: parties,
    filterBy: {
      party_code: (item, value) => matchTextColumnFilter(value, item.party_code),
      party_name: (item, value) => matchTextColumnFilter(value, item.party_name),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        party_code: (a, b) => a.party_code.localeCompare(b.party_code),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const mandateTable = useClientListTable({
    columns: mandateColumns,
    items: mandates,
    filterBy: {
      mandate_code: (item, value) => matchTextColumnFilter(value, item.mandate_code),
      party_code: (item, value) => matchTextColumnFilter(value, item.party_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        mandate_code: (a, b) => a.mandate_code.localeCompare(b.mandate_code),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const planTable = useClientListTable({
    columns: planColumns,
    items: plans,
    filterBy: {
      plan_code: (item, value) => matchTextColumnFilter(value, item.plan_code),
      mandate_code: (item, value) => matchTextColumnFilter(value, item.mandate_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        plan_code: (a, b) => a.plan_code.localeCompare(b.plan_code),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto p-4">
      <PageHeader title={t("loan_vfu.title")} description={t("loan_vfu.description")} />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("loan_vfu.parties_title")}</h2>
          <Button size="sm" variant="outline" onClick={() => setDialogTarget("party")}>
            <Plus className="size-3.5" />
            {t("loan_vfu.create_party")}
          </Button>
        </div>
        {loading ? (
          <DataTableSkeleton columnCount={4} rowCount={4} />
        ) : (
          <DataTable table={partyTable.table} totalRows={partyTable.total}>
            <ListTableToolbar
              table={partyTable.table}
              onCreate={() => setDialogTarget("party")}
              createLabel={t("loan_vfu.create_party")}
            />
          </DataTable>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("loan_vfu.mandates_title")}</h2>
          <Button size="sm" variant="outline" onClick={() => setDialogTarget("mandate")}>
            <Plus className="size-3.5" />
            {t("loan_vfu.create_mandate")}
          </Button>
        </div>
        {loading ? (
          <DataTableSkeleton columnCount={4} rowCount={4} />
        ) : (
          <DataTable table={mandateTable.table} totalRows={mandateTable.total}>
            <ListTableToolbar
              table={mandateTable.table}
              onCreate={() => setDialogTarget("mandate")}
              createLabel={t("loan_vfu.create_mandate")}
            />
          </DataTable>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("loan_vfu.plans_title")}</h2>
          <Button size="sm" variant="outline" onClick={() => setDialogTarget("plan")}>
            <Plus className="size-3.5" />
            {t("loan_vfu.create_plan")}
          </Button>
        </div>
        {loading ? (
          <DataTableSkeleton columnCount={5} rowCount={4} />
        ) : (
          <DataTable table={planTable.table} totalRows={planTable.total}>
            <ListTableToolbar
              table={planTable.table}
              onCreate={() => setDialogTarget("plan")}
              createLabel={t("loan_vfu.create_plan")}
            />
          </DataTable>
        )}
      </section>

      <VfuCreateDialog
        target={dialogTarget}
        onOpenChange={(open) => !open && setDialogTarget(null)}
        onSaved={loadAll}
      />
    </section>
  )
}

