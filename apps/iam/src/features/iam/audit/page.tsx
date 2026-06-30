import type { ColumnDef } from "@tanstack/react-table"
import { useEffect, useMemo, useState } from "react"
import { auditApi } from "@/features/iam/audit"
import type { AuditEvent, AuditStats, ChainVerification } from "@/features/iam/audit"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { DataTableToolbar } from "@workspace/ui/components/data-table/data-table-toolbar"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { useDataTable } from "@workspace/ui/hooks/use-data-table"
import { useI18n } from "@workspace/i18n"

const DEFAULT_PAGE_SIZE = 10

const RESULT_VARIANTS: Partial<Record<string, "default" | "success" | "error" | "warning" | "info">> = {
  success: "success",
  failure: "error",
  denied: "error",
  blocked: "warning",
}

export function AuditPage() {
  const { t, formatDate, formatNumber } = useI18n()
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [verifyResult, setVerifyResult] = useState<ChainVerification | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showVerify, setShowVerify] = useState(false)

  const eventTypeOptions = useMemo(
    () => [
      { label: t("admin.audit.event_type.login_attempt"), value: "login_attempt" },
      { label: t("admin.audit.event_type.login_blocked"), value: "login_blocked" },
      { label: t("admin.audit.event_type.session_created"), value: "session_created" },
      { label: t("admin.audit.event_type.session_revoked"), value: "session_revoked" },
      { label: t("admin.audit.event_type.token_issued"), value: "token_issued" },
      { label: t("admin.audit.event_type.token_refreshed"), value: "token_refreshed" },
      { label: t("admin.audit.event_type.permission_denied"), value: "permission_denied" },
      { label: t("admin.audit.event_type.consent_granted"), value: "consent_granted" },
    ],
    [t]
  )
  const resultOptions = useMemo(
    () => [
      { label: t("admin.audit.result_value.success"), value: "success" },
      { label: t("admin.audit.result_value.failure"), value: "failure" },
      { label: t("admin.audit.result_value.denied"), value: "denied" },
      { label: t("admin.audit.result_value.blocked"), value: "blocked" },
    ],
    [t]
  )

  const columns = useMemo<ColumnDef<AuditEvent>[]>(() => [
    {
      id: "timestamp",
      accessorKey: "timestamp",
      header: t("admin.audit.time"),
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground text-xs">
          {row.original.timestamp ? formatDate(row.original.timestamp) : "-"}
        </span>
      ),
    },
    {
      id: "subject",
      accessorKey: "subject",
      header: t("admin.audit.subject"),
      enableColumnFilter: true,
      meta: {
        label: t("admin.audit.subject"),
        variant: "text",
        placeholder: t("admin.audit.search_subject"),
      },
      cell: ({ row }) => (
        <span className="block max-w-40 truncate">{row.original.subject || "-"}</span>
      ),
    },
    {
      id: "eventType",
      accessorKey: "eventType",
      header: t("admin.audit.type"),
      enableColumnFilter: true,
      meta: {
        label: t("admin.audit.type"),
        variant: "multiSelect",
        options: eventTypeOptions,
      },
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.eventType || "-"}</span>,
    },
    {
      accessorKey: "action",
      header: t("admin.audit.action"),
      cell: ({ row }) => row.original.action || "-",
    },
    {
      accessorKey: "resource",
      header: t("admin.audit.resource"),
      cell: ({ row }) => row.original.resource || "-",
    },
    {
      id: "result",
      accessorKey: "result",
      header: t("admin.audit.result"),
      enableColumnFilter: true,
      meta: {
        label: t("admin.audit.result"),
        variant: "multiSelect",
        options: resultOptions,
      },
      cell: ({ row }) => (
        <Status variant={RESULT_VARIANTS[row.original.result] || "default"}>
          <StatusIndicator />
          <StatusLabel>{row.original.result || "-"}</StatusLabel>
        </Status>
      ),
    },
    {
      accessorKey: "clientIp",
      header: "IP",
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.clientIp || "-"}</span>,
    },
  ], [eventTypeOptions, formatDate, resultOptions, t])

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))

  const { table } = useDataTable<AuditEvent>({
    columns,
    data: events,
    pageCount: totalPages,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    },
  })

  const tableState = table.getState()
  const pageIndex = tableState.pagination.pageIndex
  const pageSize = tableState.pagination.pageSize
  const eventTypeFilter = tableState.columnFilters.find((f) => f.id === "eventType")?.value as string[] | undefined
  const resultFilter = tableState.columnFilters.find((f) => f.id === "result")?.value as string[] | undefined
  const subjectFilter = tableState.columnFilters.find((f) => f.id === "subject")?.value as string[] | string | undefined
  const eventTypes = eventTypeFilter?.join(",") ?? ""
  const result = resultFilter?.length === 1 ? resultFilter[0] : ""
  const subject = Array.isArray(subjectFilter) ? subjectFilter.join(" ") : (subjectFilter ?? "")
  const timestampSort = tableState.sorting.find((sort) => sort.id === "timestamp")
  const sort = timestampSort && !timestampSort.desc ? "timestamp" : ""

  const load = async () => {
    setLoading(true)
    try {
      const res = await auditApi.query({
        event_type: eventTypes ? eventTypes.split(",") : undefined,
        result: result || undefined,
        subject: subject || undefined,
        page: pageIndex + 1,
        size: pageSize,
        sort: sort || undefined,
      })
      setEvents(res.events)
      setTotal(res.total)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [eventTypes, pageIndex, pageSize, result, subject, sort])

  const loadStats = async () => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    try {
      const s = await auditApi.stats(weekAgo.toISOString(), now.toISOString())
      setStats(s)
    } catch {}
  }

  useEffect(() => {
    loadStats()
  }, [])

  const handleVerify = async () => {
    setShowVerify(!showVerify)
    if (!showVerify) {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      try {
        const v = await auditApi.verify(weekAgo.toISOString(), now.toISOString())
        setVerifyResult(v)
      } catch {}
    }
  }

  if (loading && events.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-foreground text-lg">{t("admin.audit.title")}</h2>
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 rounded-md border bg-muted/30" />
          ))}
        </div>
        <DataTableSkeleton columnCount={7} rowCount={10} filterCount={3} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-bold text-foreground text-lg">{t("admin.audit.title")}</h2>
        <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-[10px]">
          {t("admin.audit.count", { count: total })}
        </Badge>
      </div>

      {stats && (
        <div className="grid gap-2 md:grid-cols-4">
          <AuditMetric label={t("admin.audit.events_7d")} value={stats.totalEvents} formatNumber={formatNumber} />
          <AuditMetric label={t("admin.audit.login_ok")} value={stats.loginSuccess} tone="success" formatNumber={formatNumber} />
          <AuditMetric label={t("admin.audit.login_fail")} value={stats.loginFailure} tone="error" formatNumber={formatNumber} />
          <AuditMetric label={t("admin.audit.event_types")} value={Object.keys(stats.byEventType).length} formatNumber={formatNumber} />
        </div>
      )}

      {showVerify && verifyResult && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/20 px-3 py-2">
          <Status variant={verifyResult.valid ? "success" : "error"}>
            <StatusIndicator />
            <StatusLabel>{verifyResult.valid ? t("admin.audit.chain_intact") : t("admin.audit.tampered_detected")}</StatusLabel>
          </Status>
          <span className="text-muted-foreground text-sm">{t("admin.audit.entries_checked", { count: verifyResult.total })}</span>
          {verifyResult.tampered && verifyResult.tampered.length > 0 && (
            <span className="text-destructive text-sm">{t("admin.audit.tampered_entries", { count: verifyResult.tampered.length })}</span>
          )}
        </div>
      )}

      <DataTable table={table}>
        <DataTableToolbar table={table}>
          <Button variant="outline" size="sm" className="h-8" onClick={handleVerify}>
            {showVerify ? t("admin.audit.hide_verify") : t("admin.audit.verify_chain")}
          </Button>
        </DataTableToolbar>
      </DataTable>
    </div>
  )
}

function AuditMetric({
  label,
  value,
  tone = "default",
  formatNumber,
}: {
  label: string
  value: number
  tone?: "default" | "success" | "error"
  formatNumber: (value: number) => string
}) {
  const valueClass =
    tone === "success"
      ? "text-green-600"
      : tone === "error"
        ? "text-destructive"
        : "text-foreground"

  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={`font-semibold text-lg leading-tight ${valueClass}`}>
        {formatNumber(value)}
      </div>
    </div>
  )
}
