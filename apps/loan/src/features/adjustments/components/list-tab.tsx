import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import {
  selectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { useClientListTable } from "@workspace/list-page/client-list"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { formatDateShort, formatMoney, fromMinor } from "@workspace/format"
import {
  adjustmentFields,
  adjustmentFieldValue,
  loanApi,
  type LoanAdjustment,
  type LoanAdjustmentKind,
} from "../../api"
import { caseDisplayLabel } from "../../case-display"
import { LOAN_DEFAULT_PAGE_SIZE } from "../../loan/list-query"

const ADJUSTMENT_STATUSES = [
  "DRAFT",
  "PENDING",
  "ACTIVE",
  "REJECTED",
  "CANCELLED",
] as const

const CONTRACT_FILTER_KEY = "adjustment_contract_code"
const STATUS_FILTER_KEY = "adjustment_status"

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
 * "Danh sách điều chỉnh {kind}" — BE list server-side
 * (`loanApi.listAdjustments(kind, { contract_code, status })`, listEnvelope
 * pages in memory). Cột: mã hồ sơ (case_display: case uuid sau submit, id
 * khi còn DRAFT), hợp đồng, các cột chính theo kind (adjustmentFields),
 * trạng thái, ngày tạo; nút Trình duyệt cho row DRAFT.
 *
 * Bộ lọc hợp đồng/trạng thái nằm trên cột (`enableColumnFilter` + meta) nên
 * `useClientListTable` URL-sync chúng; effect fetch đọc lại chính các tham số
 * đó từ URL để giữ nguyên truy vấn server-side.
 */
export function AdjustmentListTab({
  kind,
  onCaseCreated,
}: {
  kind: LoanAdjustmentKind
  /** Gọi sau khi Trình duyệt thành công, kèm case uuid mới tạo (nếu có). */
  onCaseCreated?: (caseId: string) => void
}) {
  const { t } = useI18n()
  const [searchParams] = useSearchParams()
  const [items, setItems] = useState<LoanAdjustment[] | null>(null)
  const [loadedKey, setLoadedKey] = useState("")
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  const contractQuery = (searchParams.get(CONTRACT_FILTER_KEY) ?? "").trim()
  const statusFilter = searchParams.get(STATUS_FILTER_KEY) ?? ""
  const paramKey = `${kind}|${contractQuery}|${statusFilter}|${reloadTick}`
  const loading = loadedKey !== paramKey

  useEffect(() => {
    let cancelled = false
    loanApi
      .listAdjustments(kind, {
        contract_code: contractQuery || undefined,
        status: statusFilter || undefined,
      })
      .then((res) => {
        if (!cancelled) {
          setItems(res.items)
          setLoadedKey(paramKey)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setItems([])
          setLoadedKey(paramKey)
          notify.error(translateApiError(error, t("loan.load_failed")))
        }
      })
    return () => {
      cancelled = true
    }
  }, [kind, paramKey, contractQuery, statusFilter, t])

  const reload = useCallback(() => setReloadTick((tick) => tick + 1), [])

  const submitAdjustment = useCallback(
    async (adjustment: LoanAdjustment) => {
      setSubmittingId(adjustment.id)
      try {
        const updated = await loanApi.submitAdjustment(kind, adjustment.id)
        if (updated.workflow_case_id) {
          // Case vừa sinh — page attach staged files vào case uuid này.
          onCaseCreated?.(updated.workflow_case_id)
        }
        notify.success(
          t("loan.submitted_with_case", {
            case: caseDisplayLabel(updated.workflow_case_id, updated.id) ?? updated.id,
          })
        )
        reload()
      } catch (error) {
        notify.error(translateApiError(error, t("loan.submit_failed")))
      } finally {
        setSubmittingId(null)
      }
    },
    [kind, onCaseCreated, reload, t]
  )

  const summaryFields = useMemo(() => adjustmentFields(kind), [kind])

  const columns = useMemo<ColumnDef<LoanAdjustment>[]>(() => {
    const base: ColumnDef<LoanAdjustment>[] = [
      {
        id: "adjustment_case",
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.case_code")} />
        ),
        enableSorting: false,
        cell: ({ row }) => {
          const label =
            caseDisplayLabel(row.original.workflow_case_id, row.original.id) ?? row.original.id
          return (
            <span className="block max-w-44 truncate font-mono text-xs" title={label}>
              {label}
            </span>
          )
        },
      },
      {
        id: CONTRACT_FILTER_KEY,
        accessorKey: "contract_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.contract_code")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("loan.field.contract_code"), t("loan.placeholder.search")),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.contract_code}</span>
        ),
      },
    ]
    for (const field of summaryFields) {
      base.push({
        id: `adjustment_summary_${field.field.replace(/\W+/g, "_")}`,
        header: t(field.labelKey),
        enableSorting: false,
        cell: ({ row }) => (
          <SummaryCell item={row.original} field={field.field} type={field.type} />
        ),
      })
    }
    base.push(
      {
        id: STATUS_FILTER_KEY,
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("loan.field.status")} />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("loan.field.status"),
          ADJUSTMENT_STATUSES.map((status) => ({
            value: status,
            label: t(`loan.status.${status.toLowerCase()}`),
          }))
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge>
        ),
      },
      {
        id: "adjustment_created_at",
        accessorKey: "created_at",
        header: t("loan.field.created_at"),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDateShort(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "adjustment_actions",
        header: () => <div className="text-right">{t("loan.field.actions")}</div>,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "DRAFT" ? (
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={submittingId === row.original.id}
                onClick={() => void submitAdjustment(row.original)}
              >
                {t("loan.submit")}
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          ),
      }
    )
    return base
  }, [summaryFields, submitAdjustment, submittingId, t])

  const table = useClientListTable({
    columns,
    items: items ?? [],
    defaultPageSize: LOAN_DEFAULT_PAGE_SIZE,
  })

  // Chỉ hiện skeleton ở lần tải đầu; các lần refetch do đổi filter giữ nguyên
  // toolbar (input không mất focus) và mờ bảng theo `fetching`.
  const initialLoading = items === null && loading

  return (
    <div className="space-y-3">
      {initialLoading ? (
        <DataTableSkeleton columnCount={6} rowCount={4} />
      ) : (
        <DataTable
          table={table.table}
          totalRows={table.total}
          className="min-h-0"
          fetching={loading}
        >
          <ListTableToolbar table={table.table}>
            <Button variant="outline" size="sm" className="h-8" onClick={reload}>
              {t("loan.reload")}
            </Button>
          </ListTableToolbar>
        </DataTable>
      )}
    </div>
  )
}

/** Per-kind main-value cell: money / percent / raw text; missing → "—". */
function SummaryCell({
  item,
  field,
  type,
}: {
  item: LoanAdjustment
  field: string
  type: "money" | "percent" | "text"
}) {
  const value = adjustmentFieldValue(item, field)
  if (value === undefined || value === "") {
    return <span className="text-xs text-muted-foreground">—</span>
  }
  if (type === "money") {
    return <span className="tabular-nums">{formatMoney(fromMinor(Number(value)))}</span>
  }
  if (type === "percent") {
    return <span className="tabular-nums">{value}%</span>
  }
  return <span>{String(value)}</span>
}
