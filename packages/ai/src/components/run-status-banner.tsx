import { useI18n } from "@workspace/i18n"
import { Sparkles, Search, Code, CheckCircle2 } from "lucide-react"

export type RunPhase = "IDLE" | "THINKING" | "SEARCHING" | "EXECUTING" | "RESPONDING"

export type RunStatusBannerProps = {
  phase: RunPhase
  detail?: string
  className?: string
}

export function RunStatusBanner({ phase, detail, className }: RunStatusBannerProps) {
  const { t } = useI18n()

  if (phase === "IDLE") return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground shadow-2xs motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 ${className || ""}`}
    >
      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        {phase === "THINKING" && <Sparkles className="size-3 motion-safe:animate-spin" />}
        {phase === "SEARCHING" && <Search className="size-3 motion-safe:animate-pulse" />}
        {phase === "EXECUTING" && <Code className="size-3 motion-safe:animate-bounce" />}
        {phase === "RESPONDING" && <CheckCircle2 className="size-3 text-emerald-500" />}
      </div>

      <span className="font-medium text-foreground">
        {phase === "THINKING" && (t("ai.status.thinking") || "Olorin đang phân tích yêu cầu...")}
        {phase === "SEARCHING" && (t("ai.status.searching") || "Đang tìm kiếm API phù hợp...")}
        {phase === "EXECUTING" && (detail || t("ai.status.executing") || "Đang truy vấn và xử lý dữ liệu...")}
        {phase === "RESPONDING" && (t("ai.status.responding") || "Đang soạn câu trả lời...")}
      </span>

      <ThinkingDots />
    </div>
  )
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-auto" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1 rounded-full bg-primary/60 motion-safe:animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  )
}
