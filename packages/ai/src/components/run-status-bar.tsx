import { useEffect, useState, useSyncExternalStore } from "react"
import { useI18n } from "@workspace/i18n"
import { useAuiState } from "@assistant-ui/react"
import { Sparkles } from "lucide-react"
import { useOlorinContext } from "../context"
import {
  getOlorinRunStatus,
  subscribeOlorinRunStatus,
} from "../run-status"
import { RunErrorCard } from "./run-error-card"
import { RunStatusBanner, type RunPhase } from "./run-status-banner"

// Live activity bar: renders nothing until a run streams, then shows what
// the agent is doing right now (thinking → calling tool → answering) with an
// elapsed timer, driven by the SSE adapter through the run-status store.
export function RunStatusBar() {
  const { threadId } = useOlorinContext()
  const status = useSyncExternalStore(
    subscribeOlorinRunStatus,
    getOlorinRunStatus,
    getOlorinRunStatus
  )

  if (status.phase === "idle" || status.threadId !== threadId) {
    return null
  }

  const phase = toBannerPhase(status)
  // search/execute have dedicated banner copy; unknown tools show their name.
  const detail =
    status.phase === "tool" && status.toolName && status.toolName !== "search" && status.toolName !== "execute"
      ? status.toolName
      : undefined

  return <RunStatusBarInner phase={phase} detail={detail} startedAt={status.startedAt} />
}

function toBannerPhase(status: {
  phase: "idle" | "thinking" | "tool" | "responding"
  toolName: string | null
}): RunPhase {
  switch (status.phase) {
    case "thinking":
      return "THINKING"
    case "tool":
      return status.toolName === "search" ? "SEARCHING" : "EXECUTING"
    case "responding":
      return "RESPONDING"
    default:
      return "IDLE"
  }
}

function RunStatusBarInner({
  phase,
  detail,
  startedAt,
}: {
  phase: RunPhase
  detail?: string
  startedAt: number | null
}) {
  const { t } = useI18n()
  const elapsedSeconds = useElapsedSeconds(startedAt)

  return (
    <div className="relative">
      <RunStatusBanner phase={phase} detail={detail} />
      {elapsedSeconds !== null && elapsedSeconds >= 3 && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground">
          {t("ai.status.elapsed", { seconds: elapsedSeconds }) || `${elapsedSeconds}s`}
        </span>
      )}
    </div>
  )
}

function useElapsedSeconds(startedAt: number | null): number | null {
  const [now, setNow] = useState(() => Date.now())
  const active = startedAt !== null

  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [active, startedAt])

  if (!active || startedAt === null) return null
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}

// Reads the terminal error off the last assistant message status (the runtime
// sets {type:"incomplete", reason:"error"} when the run throws) — no separate
// error store needed.
function useLastRunError(): string | null {
  const messages = useAuiState((s) => s.thread.messages)
  const last = messages[messages.length - 1]
  if (!last || last.role !== "assistant") return null
  const status = last.status
  if (status?.type !== "incomplete" || status.reason !== "error") return null
  if (typeof status.error === "string") return status.error
  if (
    status.error &&
    typeof status.error === "object" &&
    "message" in status.error &&
    typeof (status.error as { message?: unknown }).message === "string"
  ) {
    return (status.error as { message: string }).message
  }
  return null
}

// RunErrorBubble surfaces the terminal error of a failed run inline in the
// thread, driven by the message status the runtime set for the failed run.
export function RunErrorBubble() {
  const error = useLastRunError()
  if (!error) return null
  return <RunErrorCard error={error} className="mx-auto w-full max-w-[90%]" />
}

// ThinkingBubble is the skeleton assistant placeholder shown while the model
// is working but has not yet emitted any content or tool call. Driven by
// thread state (running + last assistant message without content) instead of
// a custom store.
export function ThinkingBubble() {
  const isRunning = useAuiState((s) => s.thread.isRunning)
  const messages = useAuiState((s) => s.thread.messages)
  const last = messages[messages.length - 1]
  const show =
    isRunning && (!last || last.role !== "assistant" || last.content.length === 0)
  if (!show) return null

  return (
    <div
      className="flex w-full justify-start py-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="flex max-w-[90%] items-start gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-2xs ring-1 ring-primary/20">
          <Sparkles className="size-3.5 motion-safe:animate-pulse" />
        </div>
        <div className="rounded-2xl rounded-tl-xs border bg-card/90 px-4 py-3 shadow-2xs">
          <div className="flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1.5 rounded-full bg-muted-foreground/40 motion-safe:animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <span className="sr-only">Đang suy nghĩ…</span>
        </div>
      </div>
    </div>
  )
}
