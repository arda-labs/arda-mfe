import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import type { ListQueryInput } from "@workspace/api/list"
import { downloadFile } from "@workspace/api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { useI18n } from "@workspace/i18n"
import { auditApi } from "./api"
import { useAuditColumns } from "./components/audit-columns"
import { auditListDefinition } from "./list-query"
import type { AuditEvent, ChainVerification } from "./types"

/**
 * Shared filter/sort dialect for the audit query and export endpoints:
 * repeated `event_type`, single `result`, `subject` and the timestamp sort.
 * iam-service reads `sort=timestamp` as ASC and defaults to DESC otherwise
 * (`order` is not consumed), so DESC requests omit `sort` instead of sending
 * a sort key the backend would silently run as ASC.
 */
function auditListParams(query: ListQueryInput) {
  return {
    event_type:
      query.event_type === undefined
        ? undefined
        : String(query.event_type).split(","),
    result: query.result === undefined ? undefined : String(query.result),
    subject: query.subject === undefined ? undefined : String(query.subject),
    sort:
      query.sort === "timestamp" && query.order !== "desc"
        ? "timestamp"
        : undefined,
  }
}

export function AuditPage() {
  const { t, formatNumber } = useI18n()
  const [showVerify, setShowVerify] = useState(false)
  const [verifyResult, setVerifyResult] = useState<ChainVerification | null>(
    null
  )
  const [verifying, setVerifying] = useState(false)

  const range = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return { from: weekAgo.toISOString(), to: now.toISOString() }
  }, [])

  const statsQuery = useQuery({
    queryKey: ["iam", "audit", "stats", range.from, range.to],
    queryFn: () => auditApi.stats(range.from, range.to),
  })
  const stats = statsQuery.data ?? null

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

  const columns = useAuditColumns()

  /**
   * Server-driven list controller: URL page/perPage/sort + `eventType`,
   * `result`, `subject` filters <-> TanStack Query cache, cancellation and
   * previous-page placeholder handled by @workspace/list-page. The page owns
   * the columns, stats header and dialogs only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
    query,
  } = useServerDataTable<AuditEvent>({
    ...auditListDefinition,
    columns,
    queryFn: async (listQuery) =>
      auditApi.query({
        ...auditListParams(listQuery),
        page: listQuery.page,
        perPage: listQuery.perPage,
      }),
  })

  const statsHeader = stats ? (
    <div className="grid gap-2 md:grid-cols-4">
      <AuditMetric
        label={t("admin.audit.events_7d")}
        value={stats.totalEvents}
        formatNumber={formatNumber}
      />
      <AuditMetric
        label={t("admin.audit.login_ok")}
        value={stats.loginSuccess}
        tone="success"
        formatNumber={formatNumber}
      />
      <AuditMetric
        label={t("admin.audit.login_fail")}
        value={stats.loginFailure}
        tone="error"
        formatNumber={formatNumber}
      />
      <AuditMetric
        label={t("admin.audit.event_types")}
        value={Object.keys(stats.byEventType).length}
        formatNumber={formatNumber}
      />
    </div>
  ) : statsQuery.isPending ? (
    <div className="grid gap-2 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-16 rounded-md border bg-muted/30" />
      ))}
    </div>
  ) : null

  const verifyBanner =
    showVerify && verifyResult ? (
      <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/20 px-3 py-2">
        <Status variant={verifyResult.valid ? "success" : "error"}>
          <StatusIndicator />
          <StatusLabel>
            {verifyResult.valid
              ? t("admin.audit.chain_intact")
              : t("admin.audit.tampered_detected")}
          </StatusLabel>
        </Status>
        <span className="text-sm text-muted-foreground">
          {t("admin.audit.entries_checked", { count: verifyResult.total })}
        </span>
        {verifyResult.tampered && verifyResult.tampered.length > 0 && (
          <span className="text-sm text-destructive">
            {t("admin.audit.tampered_entries", {
              count: verifyResult.tampered.length,
            })}
          </span>
        )}
      </div>
    ) : null

  return (
    <ListPageShell
      title={t("admin.audit.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("admin.audit.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      fetching={isFetching}
      table={table}
      header={
        statsHeader || verifyBanner ? (
          <div className="flex flex-col gap-2">
            {statsHeader}
            {verifyBanner}
          </div>
        ) : undefined
      }
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("admin.audit.title")}
          sheetName={t("admin.audit.title")}
          totalRowsCount={total}
          onServerExport={async ({ format, filename }) => {
            const exportUrl = auditApi.getExportUrl({
              ...auditListParams(query),
              format,
            })
            await downloadFile(exportUrl, {
              filename: filename
                ? filename.endsWith(`.${format}`)
                  ? filename
                  : `${filename}.${format}`
                : undefined,
              fallbackFilename: `audit_export.${format}`,
            })
          }}
        >
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            disabled={verifying}
            onClick={() => void handleVerify()}
          >
            {showVerify
              ? t("admin.audit.hide_verify")
              : t("admin.audit.verify_chain")}
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
  const valueClass =
    tone === "success"
      ? "text-green-600"
      : tone === "error"
        ? "text-destructive"
        : "text-foreground"
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg leading-tight font-semibold ${valueClass}`}>
        {formatNumber(value)}
      </div>
    </div>
  )
}
