import { useCallback, useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useNavigate } from "react-router-dom"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  selectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { CheckCircle2, Plus } from "lucide-react"
import { formatDateShort, formatAmount, fromMinor } from "@workspace/format"
import { collectionApi, type LoanCollection } from "../api"
import { caseDisplayLabel, truncateMiddle } from "../case-display"
import { collectionsListDefinition } from "./list-query"

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  APPROVED: "default",
  POSTED: "default",
  REJECTED: "destructive",
  CANCELLED: "outline",
}

const STATUS_VALUES = ["DRAFT", "SUBMITTED", "APPROVED", "POSTED", "REJECTED", "CANCELLED"] as const

/** Collections — principal + interest receipts (LNM.301.02): create →
 * submit case → approval → finance posting. Server tier after the BE
 * adopted ParseListRequest (q ILIKE + sort whitelist + SQL paging). */
export function CollectionsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      DRAFT: t("loan.status.draft"),
      SUBMITTED: t("loan.status.submitted"),
      APPROVED: t("loan.status.approved"),
      POSTED: t("loan.status.posted"),
      REJECTED: t("loan.status.rejected"),
      CANCELLED: t("loan.status.cancelled"),
    }),
    [t]
  )

  const submit = useCallback(
    async (item: LoanCollection) => {
      try {
        const updated = await collectionApi.submit(item.id)
        // Prefer the friendly case_code; the uuid is the fallback.
        const caseLabel = caseDisplayLabel(
          updated.workflow_case_code,
          updated.workflow_case_id
        )
        notify.success(
          caseLabel
            ? t("loan.submitted_with_case", { case: caseLabel })
            : t("loan.submitted")
        )
      } catch (error) {
        notify.error(translateApiError(error, t("loan.submit_failed")))
      }
    },
    [t]
  )

  const columns = useMemo<ColumnDef<LoanCollection>[]>(
    () => [
      {
        id: "agreement_code",
        accessorKey: "agreement_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.agreement_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.field.agreement_code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.agreement_code}</span>
        ),
      },
      {
        id: "contract_code",
        accessorKey: "contract_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.contract_code")} />
        ),
      },
      {
        id: "principal_minor",
        accessorKey: "principal_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.collections.field.principal")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatAmount(fromMinor(row.original.principal_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        id: "interest_minor",
        accessorKey: "interest_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.collections.field.interest")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatAmount(fromMinor(row.original.interest_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        id: "collection_date",
        accessorKey: "collection_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.collections.field.collection_date")} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.collection_date)}</span>
        ),
      },
      {
        id: "workflow_case_id",
        accessorKey: "workflow_case_id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.case")} />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const caseLabel = caseDisplayLabel(
            row.original.workflow_case_code,
            row.original.workflow_case_id
          )
          return caseLabel ? (
            <span
              className="block max-w-40 truncate font-mono text-xs text-muted-foreground"
              title={caseLabel}
            >
              {truncateMiddle(caseLabel)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.status")} />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("loan.field.status"),
          STATUS_VALUES.map((value) => ({ label: statusLabels[value], value }))
        ),
        cell: ({ row }) => (
          <Badge variant={statusVariant[row.original.status] ?? "outline"}>
            {statusLabels[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">{t("loan.field.actions")}</div>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            {row.original.status === "DRAFT" ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                onClick={() => void submit(row.original)}
              >
                <CheckCircle2 className="size-3.5" />
                {t("loan.submit")}
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [statusLabels, submit, t]
  )

  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<LoanCollection>({
    ...collectionsListDefinition,
    columns,
    queryFn: async (query) =>
      collectionApi.list({
        q: query.q === undefined ? undefined : String(query.q),
        status: query.status === undefined ? undefined : String(query.status),
        page: query.page,
        per_page: query.perPage,
        sort: query.sort,
        order: query.order,
      }),
  })

  return (
    <ListPageShell
      title={t("loan.collections.title")}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("loan.count_badge", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      fetching={isFetching}
      table={table}
      header={
        <>
          <p className="text-sm text-muted-foreground">{t("loan.collections.description")}</p>
          <p className="text-xs text-muted-foreground">{t("loan.workbench_hint")}</p>
        </>
      }
      toolbar={
        <ListTableToolbar table={table}>
          <Button
            onClick={() => navigate("/loans/collections/new")}
            className="h-8 px-3 text-xs font-semibold"
          >
            <Plus className="mr-1 size-3.5" />
            {t("loan.collections.batch_create_action")}
          </Button>
        </ListTableToolbar>
      }
    />
  )
}
