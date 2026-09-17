import { useCallback, useEffect, useMemo, useState } from "react"
import { RefreshCw } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { attachStagedCaseFiles, useStagedAttachments } from "@workspace/case-tabs"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
import { formatMoney, fromMinor, todayISO } from "@workspace/format"
import { specificProvisionApi, type SpecificProvision } from "../api"
import { ProvisionForm } from "./components/ProvisionForm"

const DEFAULT_PAGE_SIZE = 10

const STATUS_LABEL_KEYS: Record<string, string> = {
  SUBMITTED: "loan.specific_provision.status.SUBMITTED",
  POSTED: "loan.specific_provision.status.POSTED",
  REJECTED: "loan.specific_provision.status.REJECTED",
}

function statusVariant(status?: string) {
  switch (status) {
    case "POSTED":
      return "default" as const
    case "SUBMITTED":
      return "secondary" as const
    case "REJECTED":
      return "destructive" as const
    default:
      return "outline" as const
  }
}

function statusLabel(status: string, t: (key: string) => string) {
  const key = STATUS_LABEL_KEYS[status]
  return key ? t(key) : status
}

/**
 * Trích lập dự phòng cụ thể (LNM.306): maker chọn thuận từ + kỳ → xem trước
 * (tỷ lệ nhóm nợ, dư nợ, khấu trừ TSBĐ, cơ sở tính, số trích) → trình duyệt
 * case. Checker duyệt ở workbench; approve sẽ post qua rule card.
 *
 * The maker form/preview (and the staged attachment panel) live in the
 * ListPageShell `header` slot; the period history below is a client-tier list
 * because `GET /api/loan/specific-provisions` returns the full set (`all=true`).
 */
export function SpecificProvisionPage() {
  const { t } = useI18n()
  // EPAS lib-bpm-tabs: page không có tabs → hiển thị panel "Hồ sơ đính kèm"
  // như một section; file staged attach vào case khi submit trả workflow_case_id.
  const staged = useStagedAttachments({ module: "loan" })
  const [agreementCode, setAgreementCode] = useState("")
  const [provisionDate, setProvisionDate] = useState(todayISO())
  const [preview, setPreview] = useState<SpecificProvision | null>(null)
  const [items, setItems] = useState<SpecificProvision[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [calculating, setCalculating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const res = await specificProvisionApi.list()
      setItems(res.items)
    } catch (error) {
      setLoadError(error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  async function calculate() {
    setCalculating(true)
    try {
      const result = await specificProvisionApi.calculate({
        agreement_code: agreementCode.trim(),
        provision_date: provisionDate,
      })
      setPreview(result)
    } catch (error) {
      notify.error(
        translateApiError(error, t("loan.specific_provision.calculate_failed"))
      )
    } finally {
      setCalculating(false)
    }
  }

  async function submit() {
    setSubmitting(true)
    try {
      const created = await specificProvisionApi.submit({
        agreement_code: agreementCode.trim(),
        provision_date: provisionDate,
      })
      try {
        await attachStagedCaseFiles(
          staged.ids,
          created.workflow_case_id ?? ""
        )
      } catch {
        notify.error(t("common.case_tabs.attachments.attach_error"))
      }
      notify.success(t("loan.specific_provision.submit_success"))
      setPreview(null)
      await load()
    } catch (error) {
      notify.error(
        translateApiError(error, t("loan.specific_provision.submit_failed"))
      )
    } finally {
      setSubmitting(false)
    }
  }

  const columns = useMemo<ColumnDef<SpecificProvision>[]>(
    () => [
      {
        id: "provision_date",
        accessorKey: "provision_date",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.specific_provision.col.date")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.provision_date}
          </span>
        ),
      },
      {
        id: "agreement_code",
        accessorKey: "agreement_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.specific_provision.col.agreement")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("loan.specific_provision.col.agreement"),
          t("loan.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.agreement_code}</span>
        ),
      },
      {
        id: "rate_percent",
        accessorKey: "rate_percent",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.specific_provision.col.rate")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.rate_percent}</span>
        ),
      },
      {
        id: "outstanding_minor",
        accessorKey: "outstanding_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.specific_provision.col.outstanding")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(fromMinor(row.original.outstanding_minor))}
          </span>
        ),
      },
      {
        id: "deduction_minor",
        accessorKey: "deduction_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.specific_provision.col.deduction")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(fromMinor(row.original.deduction_minor))}
          </span>
        ),
      },
      {
        id: "base_minor",
        accessorKey: "base_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.specific_provision.col.base")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(fromMinor(row.original.base_minor))}
          </span>
        ),
      },
      {
        id: "amount_minor",
        accessorKey: "amount_minor",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.specific_provision.col.amount")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMoney(fromMinor(row.original.amount_minor))}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.specific_provision.col.status")}
          />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("loan.specific_provision.col.status"),
          Object.keys(STATUS_LABEL_KEYS).map((status) => ({
            value: status,
            label: statusLabel(status, t),
          }))
        ),
        cell: ({ row }) => (
          <Badge variant={statusVariant(row.original.status)}>
            {row.original.status ? statusLabel(row.original.status, t) : "—"}
          </Badge>
        ),
      },
      {
        id: "workflow_case_code",
        accessorKey: "workflow_case_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("loan.specific_provision.col.case")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.workflow_case_code || "—"}
          </span>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable<SpecificProvision>({
    columns,
    items,
    filterBy: {
      agreement_code: (item, value) =>
        matchTextColumnFilter(value, item.agreement_code),
      status: (item, value) => matchSelectFilter(item.status ?? "", value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        provision_date: (a, b) =>
          a.provision_date.localeCompare(b.provision_date),
        agreement_code: (a, b) => a.agreement_code.localeCompare(b.agreement_code),
        rate_percent: (a, b) => a.rate_percent - b.rate_percent,
        outstanding_minor: (a, b) => a.outstanding_minor - b.outstanding_minor,
        deduction_minor: (a, b) => a.deduction_minor - b.deduction_minor,
        base_minor: (a, b) => a.base_minor - b.base_minor,
        amount_minor: (a, b) => a.amount_minor - b.amount_minor,
        status: (a, b) => (a.status ?? "").localeCompare(b.status ?? ""),
        workflow_case_code: (a, b) =>
          (a.workflow_case_code ?? "").localeCompare(
            b.workflow_case_code ?? ""
          ),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const busy = calculating || submitting

  return (
    <ListPageShell
      title={t("loan.specific_provision.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("loan.specific_provision.count_badge", { count: total })}
        </Badge>
      }
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={loading || refreshing}
          onClick={() => void load()}
        >
          <RefreshCw className="size-4" />
          {t("loan.specific_provision.refresh")}
        </Button>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(true)}
      fetching={refreshing}
      table={table}
      header={
        <div className="flex max-h-[55vh] shrink-0 flex-col gap-3 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
          <p className="text-sm text-muted-foreground">
            {t("loan.specific_provision.description")}
          </p>
          <ProvisionForm
            agreementCode={agreementCode}
            onAgreementCodeChange={setAgreementCode}
            provisionDate={provisionDate}
            onProvisionDateChange={setProvisionDate}
            preview={preview}
            busy={busy}
            onCalculate={() => void calculate()}
            onSubmit={() => void submit()}
          />
          {staged.tab.content}
        </div>
      }
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("loan.specific_provision.title")}
          sheetName={t("loan.specific_provision.title")}
          totalRowsCount={total}
        />
      }
    />
  )
}
