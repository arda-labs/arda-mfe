import { useCallback, useEffect, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
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
import { formatDateShort } from "@workspace/format"
import { statisticalApi, type ImportTransaction } from "../api"

const DEFAULT_PAGE_SIZE = 10

const STATUS_LABEL_KEYS: Record<string, string> = {
  STAGED: "statistical.import.status.STAGED",
  SUBMITTED: "statistical.import.status.SUBMITTED",
  POSTED: "statistical.import.status.POSTED",
  CANCELLED: "statistical.import.status.CANCELLED",
}

function statusLabel(status: string, t: (key: string) => string) {
  const key = STATUS_LABEL_KEYS[status]
  return key ? t(key) : status
}

/**
 * QCMS import transaction staging (fe_statistical #20): stage import rows per
 * (import type, period) then submit them. The staging form sits in the shell
 * `header` slot; the transaction history is a client-tier list (the endpoint
 * returns the full set).
 */
export function ImportPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<ImportTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [busy, setBusy] = useState("")
  const [importType, setImportType] = useState("")
  const [period, setPeriod] = useState("")
  const [rowCount, setRowCount] = useState("0")

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      setItems(await statisticalApi.listImportTransactions())
    } catch (reason) {
      setItems([])
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load(true)
  }, [load])

  const stage = async () => {
    if (!importType.trim() || !period.trim()) {
      notify.error(t("statistical.import.validation.required"))
      return
    }
    try {
      await statisticalApi.upsertImportTransaction({
        import_type_code: importType.trim(),
        period_code: period.trim(),
        row_count: Number(rowCount) || 0,
        status: "STAGED",
        payload: {},
      })
      notify.success(t("statistical.import.toast.staged"))
      setImportType("")
      setPeriod("")
      setRowCount("0")
      await load()
    } catch (err) {
      notify.error(
        t("statistical.import.toast.failed"),
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  const submit = useCallback(
    async (row: ImportTransaction) => {
      setBusy(row.id)
      try {
        await statisticalApi.submitImportTransaction(row.id)
        notify.success(t("statistical.import.toast.submitted"))
        await load()
      } catch (err) {
        notify.error(
          t("statistical.import.toast.failed"),
          err instanceof Error ? err.message : String(err)
        )
      } finally {
        setBusy("")
      }
    },
    [load, t]
  )

  const columns = useMemo<ColumnDef<ImportTransaction>[]>(
    () => [
      {
        id: "import_type_code",
        accessorKey: "import_type_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.import.field.type")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("statistical.import.field.type"),
          t("statistical.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.import_type_code}
          </span>
        ),
      },
      {
        id: "period_code",
        accessorKey: "period_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.import.field.period")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("statistical.import.field.period"), "2026-09"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.period_code}</span>
        ),
      },
      {
        id: "row_count",
        accessorKey: "row_count",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.import.field.rows")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.row_count}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("common.field.status"),
          Object.keys(STATUS_LABEL_KEYS).map((status) => ({
            value: status,
            label: statusLabel(status, t),
          }))
        ),
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === "POSTED" ? "default" : "secondary"}
          >
            {statusLabel(row.original.status, t)}
          </Badge>
        ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.created")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDateShort(row.original.created_at)}
          </span>
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
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              disabled={row.original.status === "POSTED" || busy === row.original.id}
              onClick={() => void submit(row.original)}
            >
              {t("statistical.import.btn.submit")}
            </Button>
          </div>
        ),
      },
    ],
    [busy, submit, t]
  )

  const { table, total } = useClientListTable<ImportTransaction>({
    columns,
    items,
    filterBy: {
      import_type_code: (item, value) =>
        matchTextColumnFilter(value, item.import_type_code),
      period_code: (item, value) =>
        matchTextColumnFilter(value, item.period_code),
      status: (item, value) => matchSelectFilter(item.status, value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        import_type_code: (a, b) =>
          a.import_type_code.localeCompare(b.import_type_code),
        period_code: (a, b) => a.period_code.localeCompare(b.period_code),
        row_count: (a, b) => a.row_count - b.row_count,
        status: (a, b) => a.status.localeCompare(b.status),
        created_at: (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("statistical.import.title")}
      header={
        <div className="flex flex-col gap-3">
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("statistical.import.description")}
          </p>
          <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4 text-xs">
            <div className="space-y-1.5">
              <Label>{t("statistical.import.field.type")}</Label>
              <Input
                className="h-8 w-48 font-mono text-xs"
                value={importType}
                onChange={(event) => setImportType(event.target.value)}
                placeholder="import-type"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("statistical.import.field.period")}</Label>
              <Input
                className="h-8 w-32 text-xs"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="2026-09"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("statistical.import.field.rows")}</Label>
              <Input
                className="h-8 w-24 text-xs"
                inputMode="numeric"
                value={rowCount}
                onChange={(event) => setRowCount(event.target.value)}
              />
            </div>
            <Button size="sm" className="text-xs" onClick={() => void stage()}>
              {t("statistical.import.btn.stage")}
            </Button>
          </div>
        </div>
      }
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("statistical.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={() => void load(true)}
      loadErrorTitle={t("statistical.import.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("statistical.import.title")}
          sheetName={t("statistical.import.title")}
          totalRowsCount={total}
        />
      }
    />
  )
}
