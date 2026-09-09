import { useCallback, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { matchTextColumnFilter, textSearchMeta } from "@workspace/list-page/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/list-page/client-list"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { formatDateShort, formatMoney, fromMinor } from "@workspace/format"
import {
  loanAdjustmentKinds,
  loanApi,
  type LoanAdjustment,
  type LoanAdjustmentKind,
} from "../../api"
import { LOAN_DEFAULT_PAGE_SIZE } from "../list-query"
import { AdjustmentCreateDialog } from "./AdjustmentCreateDialog"

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "ACTIVE":
    case "APPROVED":
      return "default"
    case "PENDING":
    case "DRAFT":
      return "secondary"
    case "REJECTED":
    case "CANCELLED":
      return "destructive"
    default:
      return "outline"
  }
}

/**
 * Adjustment flows sub-table — one kind at a time, client tier: the BE
 * returns the full per-kind list (allow-all) and the set is small, so
 * filter/sort/paginate in RAM. Owns the kind selector, the create dialog
 * (payload per BE validateKindPayload) and the DRAFT → submit action;
 * submit reloads the list because the section owns the kind.
 */
export function AdjustmentsSection() {
  const { t } = useI18n()
  const [kind, setKind] = useState<LoanAdjustmentKind>("debt-change")
  const [items, setItems] = useState<LoanAdjustment[]>([])
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const loadAdjustments = useCallback(
    async (target: LoanAdjustmentKind) => {
      setLoading(true)
      try {
        const result = await loanApi.listAdjustments(target)
        setItems(result.items)
        setLoaded(true)
      } catch (error) {
        notify.error(translateApiError(error, t("loan.load_failed")))
      } finally {
        setLoading(false)
      }
    },
    [t]
  )

  const submitAdjustment = useCallback(
    async (adjustment: LoanAdjustment) => {
      setSubmittingId(adjustment.id)
      try {
        const updated = await loanApi.submitAdjustment(kind, adjustment.id)
        notify.success(
          updated.workflow_case_id
            ? t("loan.submitted_with_case", { case: updated.workflow_case_id })
            : t("loan.submitted")
        )
        await loadAdjustments(kind)
      } catch (error) {
        notify.error(translateApiError(error, t("loan.submit_failed")))
      } finally {
        setSubmittingId(null)
      }
    },
    [kind, loadAdjustments, t]
  )

  const columns = useMemo<ColumnDef<LoanAdjustment>[]>(
    () => [
      {
        id: "adjustment_contract_code",
        accessorKey: "contract_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.contract_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.field.contract_code"), t("loan.placeholder.search")),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">
            {row.original.contract_code}
          </span>
        ),
      },
      {
        id: "adjustment_effective_date",
        accessorKey: "effective_date",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.effective_date")} />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDateShort(row.original.effective_date)}
          </span>
        ),
      },
      {
        id: "adjustment_amount",
        accessorKey: "amount_minor",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.amount")} />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{formatMoney(fromMinor(row.original.amount_minor))}</span>
        ),
      },
      {
        id: "adjustment_status",
        accessorKey: "status",
        header: t("loan.field.status"),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "adjustment_actions",
        header: t("loan.field.actions"),
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "DRAFT" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={submittingId === row.original.id}
              onClick={() => void submitAdjustment(row.original)}
            >
              {t("loan.submit")}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      },
    ],
    [submitAdjustment, submittingId, t]
  )

  const table = useClientListTable({
    columns,
    items,
    filterBy: {
      adjustment_contract_code: (item, value) =>
        matchTextColumnFilter(value, item.contract_code),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        contract_code: (a, b) => a.contract_code.localeCompare(b.contract_code),
        effective_date: (a, b) =>
          (a.effective_date ?? "").localeCompare(b.effective_date ?? ""),
        amount_minor: (a, b) => (a.amount_minor ?? 0) - (b.amount_minor ?? 0),
      }),
    defaultPageSize: LOAN_DEFAULT_PAGE_SIZE,
  })

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t("loan.adjustments_title")}</h2>
        <div className="flex items-center gap-2">
          <Select
            value={kind}
            onValueChange={(value) => {
              const next = value as LoanAdjustmentKind
              setKind(next)
              void loadAdjustments(next)
            }}
          >
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {loanAdjustmentKinds.map((entry) => (
                <SelectItem key={entry.key} value={entry.key}>
                  {t(entry.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => void loadAdjustments(kind)}>
            {t("loan.reload")}
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            {t("loan.adjustment_create.action")}
          </Button>
        </div>
      </div>
      {loading ? (
        <DataTableSkeleton columnCount={5} rowCount={4} />
      ) : (
        <DataTable table={table.table} totalRows={table.total} className="min-h-0">
          <ListTableToolbar table={table.table} />
        </DataTable>
      )}
      {!loading && !loaded ? (
        <p className="text-xs text-muted-foreground">{t("loan.adjustments_hint")}</p>
      ) : null}
      <AdjustmentCreateDialog
        kind={kind}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={async () => {
          await loadAdjustments(kind)
        }}
      />
    </section>
  )
}
