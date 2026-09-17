import { useCallback, useEffect, useMemo, useState } from "react"
import { hasAnyPermission, useAuthStore } from "@workspace/auth"
import { useI18n } from "@workspace/i18n"
import {
  matchSelectFilter,
  matchTextColumnFilter,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { notify } from "@workspace/ui/feedback/notify"
import { RefreshCw } from "lucide-react"
import { toolsApi, type UpdateToolPayload } from "./api"
import { useToolColumns } from "./components/tool-columns"
import { ToolDetailDialog } from "./components/tool-detail-dialog"
import type { CatalogTool, RiskLevel } from "./types"

const DEFAULT_PAGE_SIZE = 20
const MANAGE_PERMISSIONS = ["ai.admin", "platform.manage", "superadmin"]
const RISK_ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 }

/**
 * AI tool catalog (`/ai/tools`). The endpoint returns the complete in-memory
 * catalog (bare array; optional limit/cursor not used), so this is a client
 * tier list: filter/sort/paginate in memory behind the shared DataTable,
 * URL-synced via useClientListTable.
 */
export function ToolsPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)

  const [tools, setTools] = useState<CatalogTool[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<CatalogTool | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingTool, setPendingTool] = useState<CatalogTool | null>(null)

  const loadTools = useCallback(async () => {
    setLoading(true)
    try {
      const data = await toolsApi.listTools()
      setTools([...data].sort((a, b) => a.sdkPath.localeCompare(b.sdkPath)))
      setLoadError(null)
    } catch (error) {
      setLoadError(error)
      notify.apiError(t("ai.tools.load_failed"), error)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadTools()
  }, [loadTools])

  const canManage = hasAnyPermission(user, MANAGE_PERMISSIONS)

  const canCall = useCallback(
    (tool: CatalogTool) =>
      tool.requiredPermissions.length === 0 ||
      hasAnyPermission(user, tool.requiredPermissions),
    [user]
  )

  const applyUpdate = useCallback((updated: CatalogTool) => {
    setTools((previous) =>
      previous.map((item) =>
        item.methodName === updated.methodName ? updated : item
      )
    )
    setSelectedTool((previous) =>
      previous?.methodName === updated.methodName ? updated : previous
    )
  }, [])

  const performUpdate = useCallback(
    async (tool: CatalogTool, payload: UpdateToolPayload) => {
      setUpdating(tool.methodName)
      try {
        // The PATCH response is the updated catalog entry (ADR-003 §5), so the
        // table state comes from the response — no refetch needed.
        const updated = await toolsApi.updateTool(tool.methodName, payload)
        applyUpdate(updated)
        notify.success(t("ai.tools.update_success", { tool: updated.sdkPath }))
      } catch (error) {
        notify.apiError(t("ai.tools.update_failed"), error)
      } finally {
        setUpdating(null)
      }
    },
    [applyUpdate, t]
  )

  const handleToggle = useCallback(
    (tool: CatalogTool, next: boolean) => {
      const risky = tool.kind === "confirm" || tool.risk === "high"
      if (!next && risky) {
        setPendingTool(tool)
        return
      }
      void performUpdate(tool, { enabled: next })
    },
    [performUpdate]
  )

  const handleRestore = useCallback(
    (tool: CatalogTool) => {
      void performUpdate(tool, { clearOverride: true })
    },
    [performUpdate]
  )

  const handleInspect = useCallback((tool: CatalogTool) => {
    setSelectedTool(tool)
    setDialogOpen(true)
  }, [])

  // Domains are derived from the payload (ADR-003 §3); a new contract domain
  // shows up here without a frontend change. Counts feed the faceted filter.
  const domainOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const tool of tools) {
      counts.set(tool.domain, (counts.get(tool.domain) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, label: value.toUpperCase(), count }))
  }, [tools])

  const columns = useToolColumns({
    domainOptions,
    canManage,
    canCall,
    updating,
    onInspect: handleInspect,
    onToggle: handleToggle,
    onRestore: handleRestore,
  })

  const { table, total } = useClientListTable<CatalogTool>({
    columns,
    items: tools,
    filterBy: {
      tool: (item, value) =>
        matchTextColumnFilter(
          value,
          item.sdkPath,
          item.methodName,
          item.jsdoc,
          ...(item.keywords ?? [])
        ),
      domain: (item, value) => matchSelectFilter(item.domain, value),
      kind: (item, value) => matchSelectFilter(item.kind, value),
      risk: (item, value) => matchSelectFilter(item.risk, value),
      enabled: (item, value) => matchSelectFilter(String(item.enabled), value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        tool: (a, b) => a.sdkPath.localeCompare(b.sdkPath),
        domain: (a, b) => a.domain.localeCompare(b.domain),
        kind: (a, b) => a.kind.localeCompare(b.kind),
        risk: (a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk],
        permissions: (a, b) =>
          a.requiredPermissions
            .join(",")
            .localeCompare(b.requiredPermissions.join(",")),
        enabled: (a, b) => Number(a.enabled) - Number(b.enabled),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const enabledCount = useMemo(
    () => tools.filter((tool) => tool.enabled).length,
    [tools]
  )

  return (
    <ListPageShell
      title={t("ai.tools.title")}
      header={
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("ai.tools.description")}
        </p>
      }
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("ai.tools.summary", { total: tools.length, enabled: enabledCount })}
        </Badge>
      }
      criticalPending={loading && tools.length === 0}
      criticalError={loadError}
      onRetry={() => void loadTools()}
      loadErrorTitle={t("ai.tools.load_failed")}
      fetching={loading && tools.length > 0}
      table={table}
      actions={
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => void loadTools()}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("ai.tools.btn.refresh")}
        </Button>
      }
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={t("ai.tools.title")}
          sheetName={t("ai.tools.title")}
          totalRowsCount={total}
        />
      }
      dialogs={
        <>
          <ToolDetailDialog
            tool={selectedTool}
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
          <AlertDialog
            open={pendingTool !== null}
            onOpenChange={(open) => {
              if (!open) setPendingTool(null)
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("ai.tools.confirm_disable.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("ai.tools.confirm_disable.description", {
                    tool: pendingTool?.sdkPath ?? "",
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("ai.tools.btn.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    const tool = pendingTool
                    setPendingTool(null)
                    if (tool) void performUpdate(tool, { enabled: false })
                  }}
                >
                  {t("ai.tools.btn.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      }
    />
  )
}
