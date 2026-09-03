import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  Building2,
  Cpu,
  Layers,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
} from "lucide-react"
import { agentsApi } from "./api"
import { AgentCard } from "./components/agent-card"
import { AgentEditorDialog } from "./components/agent-editor-dialog"
import type { AgentConfig } from "./types"

const FILTER_DEPTS = ["all", "HR", "Sales", "Finance", "Tech", "General"]

export function AgentsPage() {
  const { t } = useI18n()
  const [agents, setAgents] = useState<AgentConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [activeDept, setActiveDept] = useState("all")
  const [editingAgent, setEditingAgent] = useState<AgentConfig | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadAgents = useCallback(async () => {
    setLoading(true)
    try {
      const data = await agentsApi.listAgents()
      setAgents(data)
    } catch {
      notify.error(t("ai.agents.load_failed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  const handleSave = async (agentData: Partial<AgentConfig>) => {
    try {
      await agentsApi.saveAgent(agentData)
      notify.success(t("ai.agents.toast.saved"))
      loadAgents()
    } catch {
      notify.error(t("ai.agents.toast.save_failed"))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await agentsApi.deleteAgent(id)
      notify.success(t("ai.agents.toast.deleted"))
      loadAgents()
    } catch {
      notify.error(t("ai.agents.toast.delete_failed"))
    }
  }

  const filtered = agents.filter((a) => {
    if (activeDept === "all") return true
    return a.department === activeDept
  })

  // Executive banking telemetry metrics
  const totalAgents = agents.length
  const deptsCount = new Set(agents.map((a) => a.department)).size
  const totalScopedTools = agents.reduce((acc, a) => acc + (a.allowedTools.includes("*") ? 15 : a.allowedTools.length), 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <PageHeader
          title={t("ai.agents.title")}
          description={t("ai.agents.description")}
          icon={Building2}
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={loadAgents}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("ai.agents.btn.refresh")}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 text-xs shadow-xs"
            onClick={() => {
              setEditingAgent(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("ai.agents.btn.create")}
          </Button>
        </div>
      </div>

      {/* Institutional Banking Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Agent Đang Vận hành</span>
            <Status variant="success">
              <StatusIndicator />
              <StatusLabel>100%</StatusLabel>
            </Status>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {totalAgents}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tất cả Agent đã kích hoạt chính sách
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Phân hệ Nghiệp vụ</span>
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {deptsCount}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            HR, Sales, Tài chính, Kỹ thuật, Vận hành
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Quyền hạn API gán quyền</span>
            <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {totalScopedTools}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Thực thi cô lập (Strictly Scoped Access)
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Hạ tầng Cụm Thực thi</span>
            <Server className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-foreground">
            Dual-Cluster
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
            <Cpu className="h-3 w-3 text-muted-foreground" />
            Cloud Gateway + K3s On-Prem LAN
          </p>
        </div>
      </div>

      {/* Segmented Department Filter */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 pb-3">
        <span className="text-xs font-medium text-muted-foreground mr-1">Bộ phận:</span>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
          {FILTER_DEPTS.map((dept) => {
            const count =
              dept === "all"
                ? agents.length
                : agents.filter((a) => a.department === dept).length
            const isActive = activeDept === dept

            return (
              <button
                key={dept}
                type="button"
                onClick={() => setActiveDept(dept)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{dept === "all" ? t("ai.agents.dept.all") : dept}</span>
                <Badge
                  variant="outline"
                  className={`h-4 min-w-4 px-1 text-[10px] font-mono leading-none border-border ${
                    isActive ? "bg-muted text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {count}
                </Badge>
              </button>
            )
          })}
        </div>
      </div>

      {/* Agents Grid */}
      {loading && agents.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={(a) => {
                setEditingAgent(a)
                setDialogOpen(true)
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AgentEditorDialog
        agent={editingAgent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
      />
    </div>
  )
}
