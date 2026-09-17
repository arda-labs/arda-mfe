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
import { statisticalApi, type CmmsResult } from "../api"

const DEFAULT_PAGE_SIZE = 10

const STATUS_LABEL_KEYS: Record<string, string> = {
  PASSED: "statistical.cmms.status.PASSED",
  FAILED: "statistical.cmms.status.FAILED",
}

function statusLabel(status: string, t: (key: string) => string) {
  const key = STATUS_LABEL_KEYS[status]
  return key ? t(key) : status
}

/**
 * CMMS compliance runs (fe_statistical #21): record a scenario run per
 * compliance period and see PASSED/FAILED history. Scenario/period config
 * lives in the QCMS catalogs. The run form sits in the shell `header` slot;
 * the run history is a client-tier list (the endpoint returns the full set).
 */
export function CmmsPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<CmmsResult[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [scenario, setScenario] = useState("")
  const [period, setPeriod] = useState("")
  const [checked, setChecked] = useState("0")
  const [failed, setFailed] = useState("0")

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      setItems(await statisticalApi.listCmmsResults())
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

  const run = async () => {
    if (!scenario.trim() || !period.trim()) {
      notify.error(t("statistical.cmms.validation.required"))
      return
    }
    try {
      await statisticalApi.runCmms({
        scenario_code: scenario.trim(),
        compliance_period: period.trim(),
        checked_count: Number(checked) || 0,
        failed_count: Number(failed) || 0,
        details: {},
      })
      notify.success(t("statistical.cmms.toast.recorded"))
      setScenario("")
      setPeriod("")
      setChecked("0")
      setFailed("0")
      await load()
    } catch (err) {
      notify.error(
        t("statistical.cmms.toast.failed"),
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  const columns = useMemo<ColumnDef<CmmsResult>[]>(
    () => [
      {
        id: "scenario_code",
        accessorKey: "scenario_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.cmms.field.scenario")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("statistical.cmms.field.scenario"),
          t("statistical.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold text-primary">
            {row.original.scenario_code}
          </span>
        ),
      },
      {
        id: "compliance_period",
        accessorKey: "compliance_period",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.cmms.field.period")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(t("statistical.cmms.field.period"), "2026-09"),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.compliance_period}
          </span>
        ),
      },
      {
        id: "checked_count",
        accessorKey: "checked_count",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.cmms.field.checked")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.checked_count}</span>
        ),
      },
      {
        id: "failed_count",
        accessorKey: "failed_count",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.cmms.field.failed")}
          />
        ),
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.failed_count}</span>
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
            variant={row.original.status === "PASSED" ? "default" : "destructive"}
          >
            {statusLabel(row.original.status, t)}
          </Badge>
        ),
      },
      {
        id: "run_at",
        accessorKey: "run_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("statistical.cmms.col.run_at")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {formatDateShort(row.original.run_at)}
          </span>
        ),
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable<CmmsResult>({
    columns,
    items,
    filterBy: {
      scenario_code: (item, value) =>
        matchTextColumnFilter(value, item.scenario_code),
      compliance_period: (item, value) =>
        matchTextColumnFilter(value, item.compliance_period),
      status: (item, value) => matchSelectFilter(item.status, value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        scenario_code: (a, b) => a.scenario_code.localeCompare(b.scenario_code),
        compliance_period: (a, b) =>
          a.compliance_period.localeCompare(b.compliance_period),
        checked_count: (a, b) => a.checked_count - b.checked_count,
        failed_count: (a, b) => a.failed_count - b.failed_count,
        status: (a, b) => a.status.localeCompare(b.status),
        run_at: (a, b) => a.run_at.localeCompare(b.run_at),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <ListPageShell
      title={t("statistical.cmms.title")}
      header={
        <div className="flex flex-col gap-3">
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("statistical.cmms.description")}
          </p>
          <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4 text-xs">
            <div className="space-y-1.5">
              <Label>{t("statistical.cmms.field.scenario")}</Label>
              <Input
                className="h-8 w-48 font-mono text-xs"
                value={scenario}
                onChange={(event) => setScenario(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("statistical.cmms.field.period")}</Label>
              <Input
                className="h-8 w-32 text-xs"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                placeholder="2026-09"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("statistical.cmms.field.checked")}</Label>
              <Input
                className="h-8 w-20 text-xs"
                inputMode="numeric"
                value={checked}
                onChange={(event) => setChecked(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("statistical.cmms.field.failed")}</Label>
              <Input
                className="h-8 w-20 text-xs"
                inputMode="numeric"
                value={failed}
                onChange={(event) => setFailed(event.target.value)}
              />
            </div>
            <Button size="sm" className="text-xs" onClick={() => void run()}>
              {t("statistical.cmms.btn.run")}
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
      loadErrorTitle={t("statistical.cmms.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("statistical.cmms.title")}
          sheetName={t("statistical.cmms.title")}
          totalRowsCount={total}
        />
      }
    />
  )
}
