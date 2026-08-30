import { useEffect, useState, useSyncExternalStore } from "react"
import { useI18n } from "@workspace/i18n"
import { useOlorinContext } from "../context"
import {
  getOlorinRunStatus,
  subscribeOlorinRunStatus,
  type OlorinRunStatus,
} from "../run-status"
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

function toBannerPhase(status: OlorinRunStatus): RunPhase {
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
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [active, startedAt])

  if (!active || startedAt === null) return null
  return Math.max(0, Math.floor((now - startedAt) / 1000))
}
