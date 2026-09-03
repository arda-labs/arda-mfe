import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  BadgeDollarSign,
  Briefcase,
  Edit2,
  Sparkles,
  Terminal,
  Trash2,
  Users,
  Wrench,
} from "lucide-react"
import type { AgentConfig, DepartmentType } from "../types"

interface AgentCardProps {
  agent: AgentConfig
  onEdit: (agent: AgentConfig) => void
  onDelete?: (id: string) => void
}

function getDepartmentIcon(dept: DepartmentType) {
  switch (dept) {
    case "HR":
      return Users
    case "Sales":
      return Briefcase
    case "Finance":
      return BadgeDollarSign
    case "Tech":
      return Terminal
    default:
      return Sparkles
  }
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const { t } = useI18n()
  const Icon = getDepartmentIcon(agent.department)

  return (
    <Card className="flex flex-col justify-between transition-all hover:border-primary/40 hover:shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg border bg-muted p-2 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{agent.name}</CardTitle>
              <div className="mt-1 flex items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] font-medium">
                  {agent.department}
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {agent.modelId.includes("flash") ? "Fast (Flash)" : "Smart (Local)"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <CardDescription className="line-clamp-2 pt-2 text-xs leading-relaxed text-muted-foreground">
          {agent.description || agent.systemPrompt}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pt-0 text-xs">
        <div className="space-y-1.5 rounded-lg border bg-muted/40 p-2.5">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t("ai.agents.field.temperature")}:</span>
            <span className="font-mono font-medium text-foreground">
              {agent.temperature}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Wrench className="h-3 w-3" />
              {t("ai.agents.field.allowed_tools")}:
            </span>
            <span className="font-mono font-medium text-primary">
              {agent.allowedTools.includes("*")
                ? t("ai.agents.tools_all")
                : `${agent.allowedTools.length} tools`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 border-t pt-2">
          {onDelete && agent.id !== "general-assistant" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(agent.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2.5 text-xs"
            onClick={() => onEdit(agent)}
          >
            <Edit2 className="h-3 w-3" />
            {t("ai.agents.btn.edit")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
