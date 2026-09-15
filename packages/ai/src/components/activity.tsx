import { useEffect, useState, type ReactNode } from "react"
import { useAuiState, useMessageTiming } from "@assistant-ui/react"
import { useI18n } from "@workspace/i18n"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import { cn } from "@workspace/ui/lib/utils"
import { ChevronDown, CircleCheck, LoaderCircle } from "lucide-react"

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
// assistant message is the operation this activity group is running. Older
// groups are never in the running state, so they never borrow the label.
function useActiveToolName(active: boolean): string | undefined {
  return useAuiState((state) => {
    if (!active || !state.thread.isRunning) return undefined
    const messages = state.thread.messages
    const last = messages[messages.length - 1]
    if (!last || last.role !== "assistant") return undefined
    return pendingToolName(last)
  })
}

// Live elapsed hint for the running group. Mounted only while running, so the
// counter starts at zero for every run and unmounting needs no cleanup state.
function ElapsedHint() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const startedAt = Date.now()
    const interval = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (seconds < 3) return null
  return (
    <span className="shrink-0 tabular-nums text-muted-foreground/70">
      {seconds}s
    </span>
  )
}

// Chat-style activity disclosure: expanded with a shimmering status while the
// agent works, collapsed into "Đã xử lý trong Xs" once the turn settles.
// Mirrors the ReasoningRoot open/streaming behavior so manual toggles stick.
export function ActivityGroup({
  running,
  children,
}: {
  running: boolean
  children: ReactNode
}) {
  const { t } = useI18n()
  const timing = useMessageTiming()
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const toolName = useActiveToolName(running)
  const open = userOpen ?? running

  const label = running
    ? t(TOOL_LABEL_KEYS[toolName ?? ""] ?? "ai.activity.working")
    : timing?.totalStreamTime
      ? t("ai.activity.done_in", {
          seconds: Math.max(1, Math.round(timing.totalStreamTime / 1000)),
        })
      : t("ai.activity.done")

  return (
    <Collapsible
      open={open}
      onOpenChange={setUserOpen}
      className="group/activity mb-1.5 w-full"
    >
      <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-hidden">
        {running ? (
          <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" />
        ) : (
          <CircleCheck className="size-3.5 shrink-0 text-emerald-500" />
        )}
        <span
          className={cn(
            "min-w-0 truncate font-medium",
            running && "shimmer motion-reduce:animate-none"
          )}
          aria-live="polite"
        >
          {label}
        </span>
        {running && <ElapsedHint />}
        <ChevronDown className="ml-auto size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-open:animate-collapsible-down data-closed:animate-collapsible-up">
        <div className="mt-1.5 ml-[7px] space-y-1.5 border-l border-border/70 pl-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
