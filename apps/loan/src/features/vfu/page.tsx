import { useMemo, useState, type ReactNode } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useAppQueryClient } from "@workspace/query/provider"
import { useI18n, translateApiError } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { PageHeader } from "@workspace/ui/components/page-header"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import type {
  ServerListDefinition,
  ServerListQueryFn,
} from "@workspace/list-page/server-list"
import { Plus } from "lucide-react"
import { formatMoney, fromMinor } from "@workspace/format"
import { vfuApi, type VfuMandate, type VfuParty, type VfuPlan } from "../api"
import {
  vfuMandateListDefinition,
  vfuPartyListDefinition,
  vfuPlanListDefinition,
} from "./list-query"
import { VfuCreateDialog, type VfuDialogTarget } from "./components/VfuCreateDialog"

/** One server-tier catalog section of the VFU page (own URL namespace). */
function VfuSection<TItem>({
  title,
  definition,
  columns,
  queryFn,
  onCreate,
}: {
  title: string
  definition: ServerListDefinition
  columns: ColumnDef<TItem>[]
  queryFn: ServerListQueryFn<TItem>
  onCreate?: ReactNode
}) {
  const { t } = useI18n()
  const { total, isLoading, isFetching, error, refetch, table } = useServerDataTable<TItem>({
    ...definition,
    columns,
    queryFn,
  })

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {onCreate}
      </div>
      {isLoading ? (
        <DataTableSkeleton columnCount={4} rowCount={4} />
      ) : (
        <DataTable table={table} totalRows={total} className="min-h-0" fetching={isFetching}>
          <ListTableToolbar table={table} />
        </DataTable>
      )}
      {error != null ? (
        <p className="text-xs text-destructive">
          {translateApiError(error, t("loan.loan_vfu.load_failed"))}{" "}
          <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => void refetch()}>
            {t("loan.retry")}
          </Button>
        </p>
      ) : null}
    </section>
  )
}

/**
 * VFU (ủy thác) hub — three stacked catalogs (parties / mandates / plans),
 * each on the server tier with its own URL param namespace. The shared
 * create dialog refetches via query-key invalidation on ["loan","vfu"].
 */
export function VfuPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const queryClient = useAppQueryClient()
  const [dialogTarget, setDialogTarget] = useState<VfuDialogTarget>(null)

  const refreshAll = () =>
    queryClient.invalidateQueries({ queryKey: ["loan", "vfu"] })

  const partyColumns = useMemo<ColumnDef<VfuParty>[]>(
    () => [
      {
        id: "party_code",
        accessorKey: "party_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.party_code")} />
        ),
        enableSorting: false,
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.loan_vfu.field.party_code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.party_code}</span>
        ),
      },
      {
        id: "party_name",
        accessorKey: "party_name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.party_name")} />
        ),
        enableSorting: false,
        cell: ({ row }) => <span className="font-medium">{row.original.party_name}</span>,
      },
      {
        id: "mobile_number",
        accessorKey: "mobile_number",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.phone")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.mobile_number || "—"}</span>
        ),
      },
      {
        id: "party_status",
        accessorKey: "status",
        header: t("loan.field.status"),
        enableSorting: false,
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
        id: "mandate_code",
        accessorKey: "mandate_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.mandate_code")} />
        ),
        enableSorting: false,
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.loan_vfu.field.mandate_code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.mandate_code}</span>
        ),
      },
      {
        id: "mandate_party_code",
        accessorKey: "party_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.party_code")} />
        ),
        enableSorting: false,
      },
      {
        id: "rate_value",
        accessorKey: "rate_value",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.rate")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.rate_value ?? "—"}</span>
        ),
      },
      {
        id: "mandate_status",
        accessorKey: "status",
        header: t("loan.field.status"),
        enableSorting: false,
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
        id: "plan_code",
        accessorKey: "plan_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.plan_code")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.plan_code}</span>
        ),
      },
      {
        id: "plan_mandate_code",
        accessorKey: "mandate_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.mandate_code")} />
        ),
        enableSorting: false,
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.loan_vfu.field.mandate_code"), t("loan.placeholder.search")),
      },
      {
        id: "allocated_amt_minor",
        accessorKey: "allocated_amt_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.allocated")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(fromMinor(row.original.allocated_amt_minor))}</span>
        ),
      },
      {
        id: "settled_amt_minor",
        accessorKey: "settled_amt_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.settled")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(fromMinor(row.original.settled_amt_minor))}</span>
        ),
      },
      {
        id: "fee_amt_minor",
        accessorKey: "fee_amt_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.loan_vfu.field.fee")} />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(fromMinor(row.original.fee_amt_minor))}</span>
        ),
      },
    ],
    [t]
  )

  const createButton = (target: NonNullable<VfuDialogTarget>, label: string) => (
    <Button size="sm" variant="outline" onClick={() => setDialogTarget(target)}>
      <Plus className="size-3.5" />
      {label}
    </Button>
  )

  return (
    <section className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto p-4 sm:p-5">
      <PageHeader title={t("loan.loan_vfu.title")} description={t("loan.loan_vfu.description")} />

      <VfuSection
        title={t("loan.loan_vfu.parties_title")}
        definition={vfuPartyListDefinition}
        columns={partyColumns}
        queryFn={async (query) =>
          vfuApi.listParties({
            q: query.q === undefined ? undefined : String(query.q),
            page: query.page,
            per_page: query.perPage,
            sort: query.sort,
            order: query.order,
          })
        }
        onCreate={createButton("party", t("loan.loan_vfu.create_party"))}
      />

      <VfuSection
        title={t("loan.loan_vfu.mandates_title")}
        definition={vfuMandateListDefinition}
        columns={mandateColumns}
        queryFn={async (query) =>
          vfuApi.listMandates({
            q: query.q === undefined ? undefined : String(query.q),
            page: query.page,
            per_page: query.perPage,
            sort: query.sort,
            order: query.order,
          })
        }
        onCreate={createButton("mandate", t("loan.loan_vfu.create_mandate"))}
      />

      <VfuSection
        title={t("loan.loan_vfu.plans_title")}
        definition={vfuPlanListDefinition}
        columns={planColumns}
        queryFn={async (query) =>
          vfuApi.listPlans({
            mandate_code: query.mandate_code === undefined ? undefined : String(query.mandate_code),
            page: query.page,
            per_page: query.perPage,
            sort: query.sort,
            order: query.order,
          })
        }
        onCreate={createButton("plan", t("loan.loan_vfu.create_plan"))}
      />

      <VfuCreateDialog
        target={dialogTarget}
        onOpenChange={(open) => !open && setDialogTarget(null)}
        onSaved={refreshAll}
      />
    </section>
  )
}
