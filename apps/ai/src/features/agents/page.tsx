import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Plus, RefreshCw, Sparkles } from "lucide-react"
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
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
            className="gap-1.5"
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

      <div className="flex flex-wrap gap-1.5">
        {FILTER_DEPTS.map((dept) => (
          <Button
            key={dept}
            variant={activeDept === dept ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs capitalize"
            onClick={() => setActiveDept(dept)}
          >
            {dept === "all" ? t("ai.agents.dept.all") : dept}
          </Button>
        ))}
      </div>

      {loading && agents.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
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
