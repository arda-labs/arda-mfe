import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  Briefcase,
  Building2,
  Cpu,
  Edit2,
  FileText,
  Scale,
  SlidersHorizontal,
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
      return Scale
    case "Tech":
      return Terminal
    default:
      return Building2
  }
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const { t } = useI18n()
  const Icon = getDepartmentIcon(agent.department)

  const tempLabel =
    agent.temperature <= 0.2
      ? "Nghiêm ngặt (Deterministic)"
      : agent.temperature <= 0.5
      ? "Cân bằng (Balanced)"
      : "Linh hoạt (Adaptive)"

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-border/80 hover:shadow-xs">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-foreground">
                {agent.name}
              </h4>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Phân hệ: <strong className="text-foreground">{agent.department}</strong>
                </span>
              </div>
            </div>
          </div>

          <Status variant="success" className="text-[10px]">
            <StatusIndicator />
            <StatusLabel>Sẵn sàng</StatusLabel>
          </Status>
        </div>

        {/* Description */}
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {agent.description || "Cấu hình chỉ thị tự động hóa cho bộ phận."}
        </p>

        {/* System Directive Monospace Box */}
        <div className="rounded-md border border-border/70 bg-muted/30 p-2 text-[11px]">
          <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">
            <FileText className="h-3 w-3" />
            Chỉ thị Hệ thống (System Prompt)
          </div>
          <p className="font-mono text-[10.5px] text-foreground/90 line-clamp-2 leading-relaxed">
            "{agent.systemPrompt}"
          </p>
        </div>

        {/* Tabular Parameter Specifications */}
        <div className="divide-y divide-border/60 rounded-md border border-border/70 bg-background/50 text-[11px]">
          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Cpu className="h-3 w-3" />
              Mô hình thực thi:
            </span>
            <span className="font-mono font-medium text-foreground text-[10.5px]">
              {agent.modelId}
            </span>
          </div>

          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <SlidersHorizontal className="h-3 w-3" />
              Nhiệt độ (Temperature):
            </span>
            <span className="font-mono font-medium text-foreground text-[10.5px]">
              {agent.temperature.toFixed(2)} ({tempLabel})
            </span>
          </div>

          <div className="flex items-center justify-between px-2.5 py-1.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Wrench className="h-3 w-3" />
              Quyền hạn công cụ:
            </span>
            <span className="font-mono font-medium text-foreground text-[10.5px]">
              {agent.allowedTools.includes("*")
                ? "Toàn quyền (Unrestricted)"
                : `${agent.allowedTools.length} công cụ gán quyền`}
            </span>
          </div>
        </div>

        {/* Tool Scopes Tag List */}
        {!agent.allowedTools.includes("*") && agent.allowedTools.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Scope:</span>
            {agent.allowedTools.slice(0, 4).map((tool) => {
              const shortName = tool.split(".").slice(-1)[0]
              return (
                <Badge
                  key={tool}
                  variant="outline"
                  className="h-4 rounded px-1.5 font-mono text-[9.5px] text-muted-foreground"
                >
                  {shortName}
                </Badge>
              )
            })}
            {agent.allowedTools.length > 4 && (
              <span className="font-mono text-[9.5px] text-muted-foreground">
                +{agent.allowedTools.length - 4} khác
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-border pt-2.5">
        {onDelete && agent.id !== "general-assistant" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(agent.id)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            {t("common.delete")}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-3 text-xs"
          onClick={() => onEdit(agent)}
        >
          <Edit2 className="h-3 w-3" />
          {t("ai.agents.btn.edit")}
        </Button>
      </div>
    </div>
  )
}
