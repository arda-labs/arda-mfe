import { useCallback, useEffect, useMemo, useState } from "react"
import { hasAnyPermission, useAuthStore } from "@workspace/auth"
import { useI18n } from "@workspace/i18n"
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
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/page-header"
import { notify } from "@workspace/ui/feedback/notify"
import { RefreshCw, Wrench } from "lucide-react"
import { toolsApi, type UpdateToolPayload } from "./api"
import { ToolsToolbar } from "./components/tools-toolbar"
import { ToolsTable } from "./components/tools-table"
import { ToolDetailDialog } from "./components/tool-detail-dialog"
import type { CatalogTool } from "./types"

const PAGE_SIZE = 20
const MANAGE_PERMISSIONS = ["ai.admin", "platform.manage", "superadmin"]

export function ToolsPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)

  const [tools, setTools] = useState<CatalogTool[]>([])
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<CatalogTool | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pendingTool, setPendingTool] = useState<CatalogTool | null>(null)

  const [domain, setDomain] = useState("all")
  const [kind, setKind] = useState("all")
  const [risk, setRisk] = useState("all")
  const [status, setStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const loadTools = useCallback(async () => {
    setLoading(true)
    try {
      const data = await toolsApi.listTools()
      setTools([...data].sort((a, b) => a.sdkPath.localeCompare(b.sdkPath)))
    } catch (error) {
      notify.apiError(t("ai.tools.load_failed"), error)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadTools()
  }, [loadTools])

  useEffect(() => {
    setPage(1)
  }, [domain, kind, risk, status, search])

  // Domains are derived from the payload (ADR-003 §3); a new contract domain
  // shows up here without a frontend change.
  const domains = useMemo(() => {
    const counts = new Map<string, number>()
    for (const tool of tools) {
      counts.set(tool.domain, (counts.get(tool.domain) ?? 0) + 1)
    }
    return [
      { value: "all", count: tools.length },
      ...Array.from(counts.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([value, count]) => ({ value, count })),
    ]
  }, [tools])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return tools.filter((tool) => {
      if (domain !== "all" && tool.domain.toLowerCase() !== domain) return false
      if (kind !== "all" && tool.kind !== kind) return false
      if (risk !== "all" && tool.risk !== risk) return false
      if (status === "enabled" && !tool.enabled) return false
      if (status === "disabled" && tool.enabled) return false
      if (query) {
        const haystack = [
          tool.sdkPath,
          tool.methodName,
          tool.jsdoc,
          ...(tool.keywords ?? []),
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [tools, domain, kind, risk, status, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const canManage = hasAnyPermission(user, MANAGE_PERMISSIONS)

  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])

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

  const enabledCount = tools.filter((tool) => tool.enabled).length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={t("ai.tools.title")}
          description={t("ai.tools.description")}
          icon={Wrench}
        />
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-[11px] text-muted-foreground">
            {t("ai.tools.summary", {
              total: tools.length,
              enabled: enabledCount,
            })}
          </span>
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
        </div>
      </div>

      <ToolsToolbar
        domains={domains}
        domain={domain}
        onDomainChange={setDomain}
        kind={kind}
        onKindChange={setKind}
        risk={risk}
        onRiskChange={setRisk}
        status={status}
        onStatusChange={setStatus}
        search={search}
        onSearchChange={setSearch}
      />

      <ToolsTable
        tools={pageItems}
        loading={loading}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
        filteredCount={filtered.length}
        canManage={canManage}
        updating={updating}
        canCall={canCall}
        onInspect={(tool) => {
          setSelectedTool(tool)
          setDialogOpen(true)
        }}
        onToggle={handleToggle}
        onRestore={handleRestore}
      />

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
            <AlertDialogCancel>{t("ai.tools.btn.cancel")}</AlertDialogCancel>
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
    </div>
  )
}
