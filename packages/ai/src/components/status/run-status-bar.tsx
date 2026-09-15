import { useI18n } from "@workspace/i18n"
import { useAuiState } from "@assistant-ui/react"
import { Sparkles } from "lucide-react"
import { RunErrorCard } from "./run-error-card"

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
// A user-requested cancel is not an error and renders nothing.
export function RunErrorBubble() {
  const error = useLastRunError()
  if (!error || error === "ai.run_cancelled") return null
  return <RunErrorCard error={error} className="mx-auto w-full max-w-[90%]" />
}

// ThinkingBubble is the shimmering placeholder shown in the sliver between the
// run starting and the runtime creating the assistant message. Once that
// message exists, the inline ActivityGroup owns the live status indicators.
export function ThinkingBubble() {
  const { t } = useI18n()
  const isRunning = useAuiState((s) => s.thread.isRunning)
  const messages = useAuiState((s) => s.thread.messages)
  const last = messages[messages.length - 1]
  const show = isRunning && (!last || last.role !== "assistant")
  if (!show) return null

  return (
    <div
      className="flex w-full justify-start py-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full items-start gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-2xs ring-1 ring-primary/20">
          <Sparkles className="size-3.5 motion-safe:animate-pulse" />
        </div>
        <div className="flex min-h-7 items-center">
          <span className="shimmer text-xs font-medium text-muted-foreground motion-reduce:animate-none">
            {t("ai.status.thinking")}
          </span>
        </div>
      </div>
    </div>
  )
}
