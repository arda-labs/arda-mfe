import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import type { AuditEvent, AuditStats, ChainVerification } from "@/features/iam/audit"
import { auditApi } from "@/features/iam/audit"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/ui/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/ui/admin-list/list-table-toolbar"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { useDataTable } from "@workspace/ui/hooks/use-data-table"
import { useI18n } from "@workspace/i18n"
import { listPageCount } from "@workspace/core/http/list-api"

const DEFAULT_PAGE_SIZE = 10

const RESULT_VARIANTS: Partial<Record<string, "default" | "success" | "error" | "warning" | "info">> = {
  success: "success",
  failure: "error",
  denied: "error",
  blocked: "warning",
}

const POS = (value: string | null, fallback: number) => {
  const n = Number.parseInt(value ?? "", 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const parseArrayParam = (raw: string | null) =>
  raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : []

export function AuditPage() {
  const { t, formatDate, formatNumber } = useI18n()
  const [searchParams] = useSearchParams()
  const [showVerify, setShowVerify] = useState(false)

  const [events, setEvents] = useState<AuditEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const hasLoadedRef = useRef(false)

  const [stats, setStats] = useState<AuditStats | null>(null)
  const [verifyResult, setVerifyResult] = useState<ChainVerification | null>(null)
  const [verifying, setVerifying] = useState(false)

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

  const pageParam = POS(searchParams.get("page"), 1)
  const pageSizeParam = POS(searchParams.get("perPage"), DEFAULT_PAGE_SIZE)
  const eventTypesParam = useMemo(
    () => parseArrayParam(searchParams.get("eventType")),
    [searchParams]
  )
  const resultParam = useMemo(
    () => parseArrayParam(searchParams.get("result")),
    [searchParams]
  )
  const subjectParam = searchParams.get("subject") || undefined
  const sortParam = searchParams.get("sort")

  const sort = useMemo(() => {
    if (!sortParam) return undefined
    try {
      const [timestampSort] = JSON.parse(sortParam) as Array<{ id: string; desc: boolean }>
      return timestampSort?.id === "timestamp" && !timestampSort.desc ? "timestamp" : undefined
    } catch {
      return undefined
    }
  }, [sortParam])

  const loadEvents = useCallback(async () => {
    setLoadError(null)
    if (hasLoadedRef.current) setRefreshing(true)
    else setLoading(true)
    try {
      const result = await auditApi.query({
        event_type: eventTypesParam.length > 0 ? eventTypesParam : undefined,
        result: resultParam.length === 1 ? resultParam[0] : undefined,
        subject: subjectParam,
        page: pageParam,
        perPage: pageSizeParam,
        sort,
      })
      setEvents(result.items)
      setTotal(result.total)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
      setRefreshing(false)
    }
  }, [eventTypesParam, pageParam, pageSizeParam, resultParam, sort, subjectParam])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const range = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return { from: weekAgo.toISOString(), to: now.toISOString() }
  }, [])

  useEffect(() => {
    let cancelled = false
    void auditApi.stats(range.from, range.to).then((nextStats) => {
      if (!cancelled) setStats(nextStats)
    })
    return () => {
      cancelled = true
    }
  }, [range.from, range.to])

  const handleVerify = async () => {
    const next = !showVerify
    setShowVerify(next)
    if (!next) {
      setVerifyResult(null)
      return
    }
    setVerifying(true)
    try {
      setVerifyResult(await auditApi.verify(range.from, range.to))
    } finally {
      setVerifying(false)
    }
  }

  const columns = useMemo<ColumnDef<AuditEvent>[]>(() => [
    {
      id: "timestamp",
      accessorKey: "timestamp",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("admin.audit.time")} />,
      cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground text-xs">{row.original.timestamp ? formatDate(row.original.timestamp) : "-"}</span>,
    },
    {
      id: "subject",
      accessorKey: "subject",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("admin.audit.subject")} />,
      enableColumnFilter: true,
      meta: { label: t("admin.audit.subject"), variant: "text", placeholder: t("admin.audit.search_subject") },
      cell: ({ row }) => <span className="block max-w-40 truncate">{row.original.subject || "-"}</span>,
    },
    {
      id: "eventType",
      accessorKey: "eventType",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("admin.audit.type")} />,
      enableColumnFilter: true,
      meta: { label: t("admin.audit.type"), variant: "multiSelect", options: eventTypeOptions },
      cell: ({ row }) => <span className="text-xs font-mono">{row.original.eventType || "-"}</span>,
    },
    {
      accessorKey: "action",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("admin.audit.action")} />,
      cell: ({ row }) => row.original.action || "-",
    },
    {
      accessorKey: "resource",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("admin.audit.resource")} />,
      cell: ({ row }) => row.original.resource || "-",
    },
    {
      id: "result",
      accessorKey: "result",
      header: ({ column }) => <DataTableColumnHeader column={column} label={t("admin.audit.result")} />,
      enableColumnFilter: true,
      meta: { label: t("admin.audit.result"), variant: "multiSelect", options: resultOptions },
      cell: ({ row }) => <Status variant={RESULT_VARIANTS[row.original.result] || "default"}><StatusIndicator /><StatusLabel>{row.original.result || "-"}</StatusLabel></Status>,
    },
    {
      accessorKey: "clientIp",
      header: ({ column }) => <DataTableColumnHeader column={column} label="IP" />,
      cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.clientIp || "-"}</span>,
    },
  ], [eventTypeOptions, formatDate, resultOptions, t])

  const totalPages = Math.max(1, listPageCount(total, pageSizeParam))

  const { table } = useDataTable<AuditEvent>({
    columns,
    data: events,
    pageCount: totalPages,
    initialState: { pagination: { pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE } },
  })

  const statsHeader = stats ? (
    <div className="grid gap-2 md:grid-cols-4">
      <AuditMetric label={t("admin.audit.events_7d")} value={stats.totalEvents} formatNumber={formatNumber} />
      <AuditMetric label={t("admin.audit.login_ok")} value={stats.loginSuccess} tone="success" formatNumber={formatNumber} />
      <AuditMetric label={t("admin.audit.login_fail")} value={stats.loginFailure} tone="error" formatNumber={formatNumber} />
      <AuditMetric label={t("admin.audit.event_types")} value={Object.keys(stats.byEventType).length} formatNumber={formatNumber} />
    </div>
  ) : loading && events.length === 0 ? (
    <div className="grid gap-2 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 rounded-md border bg-muted/30" />)}
    </div>
  ) : null

  const verifyBanner = showVerify && verifyResult ? (
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
  ) : null

  return (
    <ListPageShell
      title={t("admin.audit.title")}
      meta={<Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">{t("admin.audit.count", { count: total })}</Badge>}
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadEvents}
      fetching={refreshing}
      table={table}
      header={statsHeader || verifyBanner ? <div className="flex flex-col gap-2">{statsHeader}{verifyBanner}</div> : undefined}
      toolbar={
        <ListTableToolbar table={table}>
          <Button variant="outline" size="sm" className="h-8" disabled={verifying} onClick={() => void handleVerify()}>
            {showVerify ? t("admin.audit.hide_verify") : t("admin.audit.verify_chain")}
          </Button>
        </ListTableToolbar>
      }
    />
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
  const valueClass = tone === "success" ? "text-green-600" : tone === "error" ? "text-destructive" : "text-foreground"
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={`text-lg leading-tight font-semibold ${valueClass}`}>{formatNumber(value)}</div>
    </div>
  )
}