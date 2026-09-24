import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useAuiState, useMessageTiming } from "@assistant-ui/react"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
import { Brain, ChevronDown, CircleCheck, LoaderCircle } from "lucide-react"

// Human activity labels for the tools the Code Mode agent calls. Anything
// unknown falls back to the generic "working" phrase.
const TOOL_LABEL_KEYS: Record<string, string> = {
  search: "ai.activity.search",
  execute: "ai.activity.execute",
  readResult: "ai.activity.read",
}

type PartLike = {
  type?: string
  toolName?: string
  result?: unknown
  args?: Record<string, unknown>
  status?: { type?: string }
}

function pendingToolName(
  message: { content: readonly PartLike[] }
): string | undefined {
  const part = message.content.find(
    (candidate) =>
      candidate.type === "tool-call" && candidate.result === undefined
  )
  return typeof part?.toolName === "string" ? part.toolName : undefined
}

// The thread runs one operation at a time, so the pending tool of the last
// assistant message is the operation this activity group is running.
function useActiveToolName(active: boolean): string | undefined {
  return useAuiState((state) => {
    if (!active || !state.thread.isRunning) return undefined
    const messages = state.thread.messages
    const last = messages[messages.length - 1]
    if (!last || last.role !== "assistant") return undefined
    return pendingToolName(last)
  })
}

// Live elapsed hint for the running group. Mounted only while running.
function ElapsedHint() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (seconds < 2) return null
  return (
    <span className="shrink-0 tabular-nums text-primary/80">
      {seconds}s
    </span>
  )
}

// Streamlined activity view: pinned cleanly in the right corner of the message header
// with zero layout flicker or bouncing accordions. Users can click to inspect the
// exact steps performed.
export function ActivityGroup({
  running,
  children,
}: {
  running: boolean
  children: ReactNode
}) {
  const { t } = useI18n()
  const timing = useMessageTiming()
  const [isOpen, setIsOpen] = useState(false)
  const toolName = useActiveToolName(running)

  const message = useAuiState((state) => state.message)
  const steps = useMemo(() => {
    const content = message?.content
    if (!Array.isArray(content)) return []

    const items: Array<{
      key: string
      type: "search" | "execute" | "read" | "reasoning" | "other"
      label: string
      status: "running" | "done"
      detail?: string
    }> = []

    for (let i = 0; i < content.length; i++) {
      const part = content[i] as PartLike
      if (part.type === "reasoning") {
        items.push({
          key: `reasoning-${i}`,
          type: "reasoning",
          label: t("ai.activity.reasoning"),
          status: part.status?.type === "running" ? "running" : "done",
        })
      } else if (part.type === "tool-call") {
        if (part.toolName === "renderChart") continue
        if (part.toolName === "search") {
          const query = typeof part.args?.query === "string" ? part.args.query : undefined
          items.push({
            key: `tool-search-${i}`,
            type: "search",
            label: t("ai.activity.search"),
            status: part.status?.type === "running" ? "running" : "done",
            detail: query,
          })
        } else if (part.toolName === "execute") {
          items.push({
            key: `tool-execute-${i}`,
            type: "execute",
            label: t("ai.activity.execute"),
            status: part.status?.type === "running" ? "running" : "done",
          })
        } else if (part.toolName === "readResult") {
          items.push({
            key: `tool-read-${i}`,
            type: "read",
            label: t("ai.activity.read"),
            status: part.status?.type === "running" ? "running" : "done",
          })
        } else if (part.toolName) {
          items.push({
            key: `tool-${part.toolName}-${i}`,
            type: "other",
            label: part.toolName,
            status: part.status?.type === "running" ? "running" : "done",
          })
        }
      }
    }
    return items
  }, [message?.content, t])

  const stepCount = steps.length > 0 ? steps.length : 1

  const label = running
    ? t(TOOL_LABEL_KEYS[toolName ?? ""] ?? "ai.activity.working")
    : timing?.totalStreamTime
      ? t("ai.activity.done_in", {
          seconds: Math.max(1, Math.round(timing.totalStreamTime / 1000)),
        })
      : t("ai.activity.done")

  return (
    <div className="group/activity w-full">
      <div className="flex w-full items-center justify-end">
        {running ? (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs text-primary shadow-2xs">
            <LoaderCircle className="size-3 shrink-0 animate-spin text-primary" />
            <span className="shimmer font-medium max-w-[180px] truncate motion-reduce:animate-none">
              {label}
            </span>
            <ElapsedHint />
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="ml-0.5 rounded p-0.5 hover:bg-primary/10 transition-colors"
              title={t("ai.activity.toggle_steps")}
              aria-label={t("ai.activity.toggle_steps")}
            >
              <ChevronDown
                className={cn(
                  "size-3 transition-transform duration-200",
                  isOpen && "rotate-180"
                )}
              />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
              isOpen
                ? "border-primary/40 bg-primary/10 text-primary font-medium shadow-2xs"
                : "border-border/60 bg-muted/40 hover:bg-muted/70 text-muted-foreground hover:text-foreground"
            )}
            title={t("ai.activity.toggle_steps")}
            aria-label={t("ai.activity.toggle_steps")}
          >
            <Brain className="size-3 text-primary/80 shrink-0" />
            <span className="font-medium">
              {timing?.totalStreamTime
                ? t("ai.activity.steps_count_done", { count: stepCount }) +
                  ` · ${(timing.totalStreamTime / 1000).toFixed(1)}s`
                : t("ai.activity.steps_count_done", { count: stepCount })}
            </span>
            <ChevronDown
              className={cn(
                "size-3 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-2 w-full rounded-xl border border-border/60 bg-card/60 p-3 shadow-2xs backdrop-blur-xs motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
          <div className="mb-2 flex items-center justify-between border-b border-border/40 pb-1.5 text-muted-foreground">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Brain className="size-3.5 text-primary" />
              {t("ai.activity.steps_title")}
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {t("ai.activity.steps_count", { count: stepCount })}
            </span>
          </div>

          {steps.length > 0 && (
            <div className="mb-2.5 space-y-1">
              {steps.map((step, idx) => (
                <div
                  key={step.key}
                  className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1 text-[11px]"
                >
                  <span className="font-mono text-[10px] text-muted-foreground/80 w-3.5 shrink-0">
                    {idx + 1}.
                  </span>
                  {step.status === "running" ? (
                    <LoaderCircle className="size-3 shrink-0 animate-spin text-primary" />
                  ) : (
                    <CircleCheck className="size-3 shrink-0 text-emerald-500" />
                  )}
                  <span className="font-medium text-foreground">{step.label}</span>
                  {step.detail && (
                    <span className="truncate text-muted-foreground max-w-[240px]">
                      ({step.detail})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-1.5 border-t border-border/40 pt-2">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
