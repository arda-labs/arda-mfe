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
import { SavedViewTabs } from "@workspace/list-page/saved-view-tabs"
import { useRecordSheet } from "@workspace/list-page/use-record-sheet"
import { CheckCircle2, CornerDownRight, FilePlus2 } from "lucide-react"
import { formatDateShort, formatAmount, fromMinor } from "@workspace/format"
import {
  disbursementApi,
  type LoanDisbursement,
  type LoanDisbursementFlowType,
} from "../api"
import { caseDisplayLabel, truncateMiddle } from "../case-display"
import { disbursementsListDefinition } from "./list-query"
import { StatusBadge } from "@workspace/ui/components/status-badge"
import { DisbursementSheet } from "./disbursement-sheet"

// Lifecycle of lnm_disbursements (loan-service domain/disbursement.go); the
// workflow CANCEL decision lands rows in CANCELLED, so it gets a view too.
const STATUS_VALUES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "POSTED", "REJECTED", "CANCELLED"] as const

const FLOW_VALUES: LoanDisbursementFlowType[] = ["REGISTER", "COMPLETE"]

const flowVariant: Record<LoanDisbursementFlowType, "default" | "info"> = {
  REGISTER: "default",
  COMPLETE: "info",
}

/** Disbursements — drawdown flow (LNM.300.02), P1b v2 two flow flavors on one
 * page: REGISTER (khởi tạo) + COMPLETE (hoàn tất, drawn against a POSTED
 * register row). Server tier after the BE adopted ParseListRequest. */
export function DisbursementsPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const navigate = useNavigate()

  const statusLabels = useMemo<Record<string, string>>(
    () => ({
      DRAFT: t("loan.status.draft"),
      PENDING_APPROVAL: t("loan.status.pending"),
      APPROVED: t("loan.status.approved"),
      POSTED: t("loan.status.posted"),
      REJECTED: t("loan.status.rejected"),
      CANCELLED: t("loan.status.cancelled"),
    }),
    [t]
  )

  const flowLabels = useMemo<Record<string, string>>(
    () => ({
      REGISTER: t("loan.disbursements.flow.register"),
      COMPLETE: t("loan.disbursements.flow.complete"),
    }),
    [t]
  )

  const submit = useCallback(
    async (item: LoanDisbursement) => {
      try {
        const updated = await disbursementApi.submit(item.id)
        // Prefer the friendly case_code; the uuid is the fallback.
        const caseLabel = caseDisplayLabel(
          updated.workflow_case_code,
          updated.workflow_case_id ?? undefined
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

  const columns = useMemo<ColumnDef<LoanDisbursement>[]>(
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
        id: "disburse_amt_minor",
        accessorKey: "disburse_amt_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.disbursements.field.amount")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatAmount(fromMinor(row.original.disburse_amt_minor, row.original.currency_code), row.original.currency_code)}
          </span>
        ),
      },
      {
        id: "disburse_date",
        accessorKey: "disburse_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.disbursements.field.disburse_date")} />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDateShort(row.original.disburse_date)}</span>
        ),
      },
      {
        id: "flow_type",
        accessorKey: "flow_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.disbursements.field.flow_type")} />
        ),
        enableColumnFilter: true,
        enableSorting: false,
        meta: selectFilterMeta(
          t("loan.disbursements.field.flow_type"),
          FLOW_VALUES.map((value) => ({ label: flowLabels[value], value }))
        ),
        cell: ({ row }) => {
          const flow: LoanDisbursementFlowType = row.original.flow_type === "COMPLETE" ? "COMPLETE" : "REGISTER"
          return (
            <Badge variant={flowVariant[flow]} className="px-2 py-0 text-[10px]">
              {flowLabels[flow] ?? flow}
            </Badge>
          )
        },
      },
      {
        id: "fund_source_code",
        accessorKey: "fund_source_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.disbursements.field.fund_source")} />
        ),
        cell: ({ row }) =>
          row.original.fund_source_code ? (
            <span className="font-mono text-xs">{row.original.fund_source_code}</span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
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
            row.original.workflow_case_id ?? undefined
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
        cell: ({ row }) => (
          <StatusBadge status={row.original.status}>
            {statusLabels[row.original.status] ?? row.original.status}
          </StatusBadge>
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
    [flowLabels, statusLabels, submit, t]
  )

  const {
    items,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
  } = useServerDataTable<LoanDisbursement>({
    ...disbursementsListDefinition,
    columns,
    queryFn: async (query) =>
      disbursementApi.list({
        q: query.q === undefined ? undefined : String(query.q),
        status: query.status === undefined ? undefined : String(query.status),
        flow_type:
          query.flow_type === undefined
            ? undefined
            : (String(query.flow_type) as LoanDisbursementFlowType),
        page: query.page,
        per_page: query.perPage,
        sort: query.sort,
        order: query.order,
      }),
  })

  // "Hoàn tất giải ngân" only makes sense when at least one POSTED register
  // row exists to draw against (filtered server-side by the picker anyway).
  const hasPostedRegister = items.some(
    (item) => item.status === "POSTED" && (item.flow_type ?? "REGISTER") === "REGISTER"
  )

  const sheet = useRecordSheet(table)
  // Work queues first (design board 12.2): the counts replace the old total badge.
  const views = useMemo(
    () => [
      { id: "all", label: t("loan.disbursements.view.all") },
      ...STATUS_VALUES.map((value) => ({ id: value, value, label: statusLabels[value] })),
    ],
    [statusLabels, t]
  )

  return (
    <ListPageShell
      title={t("loan.disbursements.title")}
      views={
        <SavedViewTabs
          views={views}
          urlKey="status"
          config={disbursementsListDefinition.queryConfig}
          countKey={disbursementsListDefinition.queryKey}
          countFn={(status) =>
            disbursementApi.list({ status, page: 1, per_page: 1 }).then((res) => res.total)
          }
          aria-label={t("loan.field.status")}
        />
      }
      onRowClick={sheet.openRow}
      activeRowId={sheet.activeRowId}
      dialogs={
        <DisbursementSheet
          record={sheet.record}
          sheet={sheet}
          statusLabels={statusLabels}
          flowLabels={flowLabels}
          onSubmit={(item) => void submit(item)}
        />
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      fetching={isFetching}
      table={table}
      header={
        <>
          <p className="text-sm text-muted-foreground">{t("loan.disbursements.description")}</p>
          <p className="text-xs text-muted-foreground">{t("loan.workbench_hint")}</p>
        </>
      }
      toolbar={
        <ListTableToolbar table={table}>
          <Button
            variant="outline"
            className="h-8 px-3 text-xs font-semibold"
            disabled={!hasPostedRegister}
            title={hasPostedRegister ? undefined : t("loan.disbursements.complete.disabled_hint")}
            onClick={() => navigate("/loans/disbursements/complete")}
          >
            <CornerDownRight className="mr-1 size-3.5" />
            {t("loan.disbursements.complete.action")}
          </Button>
          <Button
            onClick={() => navigate("/loans/disbursements/register")}
            className="h-8 px-3 text-xs font-semibold"
          >
            <FilePlus2 className="mr-1 size-3.5" />
            {t("loan.disbursements.batch_register_action")}
          </Button>
        </ListTableToolbar>
      }
    />
  )
}
