import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  BadgeDollarSign,
  Bot,
  Briefcase,
  Edit2,
  Quote,
  Sparkles,
  Terminal,
  Trash2,
  Users,
  Wrench,
  Zap,
} from "lucide-react"
import type { AgentConfig, DepartmentType } from "../types"

interface AgentCardProps {
  agent: AgentConfig
  onEdit: (agent: AgentConfig) => void
  onDelete?: (id: string) => void
}

interface DepartmentStyle {
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  glowColor: string
  badgeVariant: "default" | "secondary" | "outline"
  badgeClass: string
  accentColor: string
}

const DEPT_STYLES: Record<DepartmentType, DepartmentStyle> = {
  HR: {
    icon: Users,
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    glowColor: "bg-emerald-500/15",
    badgeVariant: "outline",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-medium",
    accentColor: "text-emerald-500",
  },
  Sales: {
    icon: Briefcase,
    gradient: "from-indigo-500/20 via-purple-500/10 to-transparent",
    glowColor: "bg-indigo-500/15",
    badgeVariant: "outline",
    badgeClass: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 font-medium",
    accentColor: "text-indigo-500",
  },
  Finance: {
    icon: BadgeDollarSign,
    gradient: "from-amber-500/20 via-yellow-500/10 to-transparent",
    glowColor: "bg-amber-500/15",
    badgeVariant: "outline",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600 font-medium",
    accentColor: "text-amber-500",
  },
  Tech: {
    icon: Terminal,
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    glowColor: "bg-cyan-500/15",
    badgeVariant: "outline",
    badgeClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600 font-medium",
    accentColor: "text-cyan-500",
  },
  General: {
    icon: Sparkles,
    gradient: "from-purple-500/20 via-pink-500/10 to-transparent",
    glowColor: "bg-purple-500/15",
    badgeVariant: "outline",
    badgeClass: "border-purple-500/30 bg-purple-500/10 text-purple-600 font-medium",
    accentColor: "text-purple-500",
  },
}

export function AgentCard({ agent, onEdit, onDelete }: AgentCardProps) {
  const { t } = useI18n()
  const style = DEPT_STYLES[agent.department] || DEPT_STYLES.General
  const Icon = style.icon

  // Temperature meter percentage (0.0 -> 1.0)
  const tempPercent = Math.min(Math.round(agent.temperature * 100), 100)
  const tempLabel =
    agent.temperature <= 0.2
      ? "Chính xác (Strict)"
      : agent.temperature <= 0.5
      ? "Cân bằng (Balanced)"
      : "Sáng tạo (Creative)"

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-4 backdrop-blur-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      {/* Ambient background glow */}
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl transition-opacity duration-300 opacity-40 group-hover:opacity-80 ${style.glowColor}`}
      />
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${style.gradient} opacity-50`}
      />

      <div className="relative space-y-3">
        {/* Header: Avatar, Name & Badges */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 shadow-2xs">
              <Icon className={`h-5 w-5 ${style.accentColor}`} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {agent.name}
              </h4>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <Badge variant={style.badgeVariant} className={`text-[10px] ${style.badgeClass}`}>
                  {agent.department}
                </Badge>
                <Badge variant="secondary" className="font-mono text-[10px] gap-1">
                  <Bot className="h-3 w-3 text-muted-foreground" />
                  {agent.modelId.includes("flash") ? "Flash" : "Local Qwen"}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Role Description */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {agent.description || "Chưa có mô tả vai trò cho Agent này."}
        </p>

        {/* System Prompt Quote Preview */}
        <div className="relative rounded-xl border border-border/60 bg-muted/30 p-2.5 text-[11px] leading-relaxed">
          <Quote className="absolute right-2 top-2 h-3.5 w-3.5 text-muted-foreground/30" />
          <span className="font-mono text-foreground/80 line-clamp-2 pr-4 italic">
            "{agent.systemPrompt}"
          </span>
        </div>

        {/* Metrics Grid: Temperature Gauge & Allowed Tools */}
        <div className="space-y-2 rounded-xl border border-border/50 bg-background/50 p-2.5">
          {/* Temperature Gauge */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground flex items-center gap-1">
                <Zap className="h-3 w-3 text-amber-500" />
                Độ sáng tạo (Temp):
              </span>
              <span className="font-mono text-[10px] font-semibold text-foreground">
                {agent.temperature} • <span className="text-muted-foreground font-normal">{tempLabel}</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500 transition-all duration-300"
                style={{ width: `${tempPercent}%` }}
              />
            </div>
          </div>

          {/* Tools Scope */}
          <div className="flex items-center justify-between border-t border-border/40 pt-1.5 text-[11px]">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Wrench className="h-3 w-3 text-primary" />
              Công cụ gán quyền:
            </span>
            <span className="font-mono text-[11px] font-semibold text-primary">
              {agent.allowedTools.includes("*")
                ? t("ai.agents.tools_all")
                : `${agent.allowedTools.length} công cụ`}
            </span>
          </div>

          {/* Tool Chips Preview */}
          {!agent.allowedTools.includes("*") && agent.allowedTools.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {agent.allowedTools.slice(0, 3).map((tool) => {
                const shortName = tool.split(".").slice(-1)[0]
                return (
                  <span
                    key={tool}
                    className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                  >
                    {shortName}
                  </span>
                )
              })}
              {agent.allowedTools.length > 3 && (
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                  +{agent.allowedTools.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="relative mt-4 flex items-center justify-end gap-1.5 border-t border-border/60 pt-2.5">
        {onDelete && agent.id !== "general-assistant" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(agent.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 px-3 text-xs group-hover:border-primary/50 group-hover:bg-primary/5 transition-all"
          onClick={() => onEdit(agent)}
        >
          <Edit2 className="h-3 w-3 text-primary" />
          {t("ai.agents.btn.edit")}
        </Button>
      </div>
    </div>
  )
}
