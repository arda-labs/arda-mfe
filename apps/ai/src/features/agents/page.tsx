import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Bot, Cpu, Plus, RefreshCw, Sparkles, Wrench, Zap } from "lucide-react"
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

  // Quick stats
  const totalAgents = agents.length
  const deptsCount = new Set(agents.map((a) => a.department)).size
  const totalTools = agents.reduce((acc, a) => acc + (a.allowedTools.includes("*") ? 15 : a.allowedTools.length), 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={t("ai.agents.title")}
          description={t("ai.agents.description")}
          icon={Sparkles}
        />
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={loadAgents}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("ai.agents.btn.refresh")}
          </Button>
          <Button
            size="sm"
            className="gap-1.5 shadow-xs"
            onClick={() => {
              setEditingAgent(null)
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            {t("ai.agents.btn.create")}
          </Button>
        </div>
      </div>

      {/* Hero Stats Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Bot className="h-3.5 w-3.5 text-primary" />
            <span>Agent Đang Hoạt động</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-foreground">{totalAgents}</span>
            <span className="text-[10px] text-emerald-600 font-medium">100% Online</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span>Phòng ban Phục vụ</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-foreground">{deptsCount}</span>
            <span className="text-[10px] text-muted-foreground">Phân hệ chuyên trách</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Wrench className="h-3.5 w-3.5 text-indigo-500" />
            <span>Tổng lượt gán Tools</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-foreground">{totalTools}</span>
            <span className="text-[10px] text-primary font-medium">Scoped Execution</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Cpu className="h-3.5 w-3.5 text-cyan-500" />
            <span>Engine Kiến trúc</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xs font-bold text-foreground">Dual-Engine</span>
            <span className="text-[10px] text-muted-foreground">Cloud + K3s Local</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">Bộ phận:</span>
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
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{dept === "all" ? t("ai.agents.dept.all") : dept}</span>
              <Badge
                variant={isActive ? "secondary" : "outline"}
                className={`h-4 min-w-4 px-1 text-[10px] font-mono leading-none ${
                  isActive ? "bg-primary-foreground/20 text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                {count}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Agents Grid */}
      {loading && agents.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted/60" />
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
