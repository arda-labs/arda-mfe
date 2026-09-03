import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import type { AgentConfig, DepartmentType } from "../types"

interface AgentEditorDialogProps {
  agent: AgentConfig | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (agent: Partial<AgentConfig>) => void
}

const DEPARTMENTS: DepartmentType[] = ["HR", "Sales", "Finance", "Tech", "General"]

const AVAILABLE_TOOLS = [
  "arda.crm.getCustomer",
  "arda.crm.listCustomers",
  "arda.finance.getAccount",
  "arda.hrm.listEmployees",
  "arda.iam.getScope",
  "arda.knowledge.search",
]

export function AgentEditorDialog({
  agent,
  open,
  onOpenChange,
  onSave,
}: AgentEditorDialogProps) {
  const { t } = useI18n()
  const [name, setName] = useState("")
  const [department, setDepartment] = useState<DepartmentType>("General")
  const [description, setDescription] = useState("")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [modelId, setModelId] = useState("gemini-2.5-flash")
  const [temperature, setTemperature] = useState(0.2)
  const [allowedTools, setAllowedTools] = useState<string[]>([])

  useEffect(() => {
    if (agent) {
      setName(agent.name)
      setDepartment(agent.department)
      setDescription(agent.description || "")
      setSystemPrompt(agent.systemPrompt)
      setModelId(agent.modelId)
      setTemperature(agent.temperature)
      setAllowedTools(agent.allowedTools || [])
    } else {
      setName("")
      setDepartment("General")
      setDescription("")
      setSystemPrompt("")
      setModelId("gemini-2.5-flash")
      setTemperature(0.2)
      setAllowedTools(["arda.knowledge.search"])
    }
  }, [agent, open])

  const toggleTool = (tool: string) => {
    setAllowedTools((prev) =>
      prev.includes(tool) ? prev.filter((tItem) => tItem !== tool) : [...prev, tool]
    )
  }

  const handleSave = () => {
    onSave({
      id: agent?.id,
      name,
      department,
      description,
      systemPrompt,
      modelId,
      temperature,
      allowedTools,
      isActive: true,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {agent ? t("ai.agents.dialog.edit_title") : t("ai.agents.dialog.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("ai.agents.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="font-medium text-foreground">{t("ai.agents.field.name")}</label>
              <Input
                className="mt-1 h-8 text-xs"
                placeholder="VD: HR Recruiter Assistant"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-medium text-foreground">{t("ai.agents.field.department")}</label>
              <Select
                value={department}
                onValueChange={(val) => setDepartment(val as DepartmentType)}
              >
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground">{t("ai.agents.field.description")}</label>
            <Input
              className="mt-1 h-8 text-xs"
              placeholder="Mô tả mục đích và vai trò của Agent..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div>
            <label className="font-medium text-foreground">{t("ai.agents.field.system_prompt")}</label>
            <Textarea
              className="mt-1 font-mono text-xs leading-relaxed"
              rows={4}
              placeholder="Nhập System Prompt định hình Persona của Agent..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="font-medium text-foreground">{t("ai.agents.field.model")}</label>
              <Select value={modelId} onValueChange={setModelId}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini-2.5-flash">
                    Gemini 2.5 Flash (Cloud Fast)
                  </SelectItem>
                  <SelectItem value="qwen2.5:7b-instruct-q4_K_M">
                    Qwen 2.5 7B (Local Privacy)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="font-medium text-foreground">{t("ai.agents.field.temperature")}</label>
                <span className="font-mono text-muted-foreground">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                className="mt-2 w-full"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground">{t("ai.agents.field.allowed_tools")}</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {AVAILABLE_TOOLS.map((tool) => {
                const checked = allowedTools.includes(tool)
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggleTool(tool)}
                    className={`rounded-md border px-2 py-1 font-mono text-[11px] transition-all ${
                      checked
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "border-border text-muted-foreground hover:border-border/80"
                    }`}
                  >
                    {tool}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("ai.agents.btn.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!name || !systemPrompt}>
            {t("ai.agents.btn.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
