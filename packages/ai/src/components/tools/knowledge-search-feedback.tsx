import { useState } from "react"
import { postCanonical } from "@workspace/api"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"
import { ThumbsDown, ThumbsUp } from "lucide-react"
import { textValue, type ToolResultPayload } from "../../lib/messages"
import type { ToolResultViewProps } from "../../lib/registry"
import { registerToolRenderer } from "../../lib/registry"

type KnowledgeSearchItem = {
  runId: string
  sourceId?: string
  sourceTitle?: string
  heading?: string
  content?: string
  citations?: unknown
  matchScore?: number
  version?: string
}

type FeedbackState = "unrated" | "submitting" | "rated" | "error"

function isKnowledgeSearchResult(result: ToolResultPayload): boolean {
  return (
    Array.isArray(result) &&
    result.length > 0 &&
    typeof result[0]?.runId === "string"
  )
}

// All items in one search result set share a single RAG run — take the first.
function runIdOf(result: ToolResultPayload): string | undefined {
  if (!Array.isArray(result)) return undefined
  return textValue(result[0]?.runId) || undefined
}

function itemsOf(result: ToolResultPayload): KnowledgeSearchItem[] {
  if (!Array.isArray(result)) return []
  return result
    .filter((item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null
    )
    .map((item) => ({
      runId: textValue(item.runId),
      sourceId: textValue(item.sourceId) || undefined,
      sourceTitle: textValue(item.sourceTitle) || undefined,
      heading: textValue(item.heading) || undefined,
      content: textValue(item.content) || undefined,
      citations: item.citations,
      matchScore: typeof item.matchScore === "number" ? item.matchScore : undefined,
      version: textValue(item.version) || undefined,
    }))
}

export function KnowledgeSearchFeedback({ result }: ToolResultViewProps) {
  const { t } = useI18n()
  const [state, setState] = useState<FeedbackState>("unrated")
  const [selected, setSelected] = useState<boolean | null>(null)

  if (!isKnowledgeSearchResult(result)) return null
  const items = itemsOf(result)
  const runId = runIdOf(result)

  const sendFeedback = (helpful: boolean) => {
    if (!runId || state === "submitting" || state === "rated") return
    setState("submitting")
    setSelected(helpful)
    postCanonical("/api/ai/feedback", { run_id: runId, helpful })
      .then(() => setState("rated"))
      .catch(() => setState("error"))
  }

  const submitting = state === "submitting"
  const rated = state === "rated"
  const selectedClass = (helpful: boolean) =>
    selected === helpful && (rated || state === "error")
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "text-muted-foreground hover:text-foreground"

  return (
    <div className="mt-2 space-y-2">
      {/* Search result items */}
      {items.map((item, idx) => (
        <div
          key={item.sourceId ? `${item.sourceId}-${idx}` : idx}
          className="rounded-lg border bg-card px-3 py-2.5 text-xs shadow-2xs"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {item.sourceTitle && (
                <p className="truncate font-medium text-foreground">
                  {item.sourceTitle}
                </p>
              )}
              {item.heading && (
                <p className="text-muted-foreground">{item.heading}</p>
              )}
            </div>
            {item.matchScore !== undefined && (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                {Math.round(item.matchScore * 100)}%
              </span>
            )}
          </div>
          {item.content && (
            <p className="mt-1 line-clamp-2 leading-relaxed text-muted-foreground">
              {item.content}
            </p>
          )}
        </div>
      ))}

      {/* Feedback footer */}
      <div className="flex items-center gap-2 pt-1">
        {rated ? (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {selected ? (
              <ThumbsUp className="size-3.5 text-primary" />
            ) : (
              <ThumbsDown className="size-3.5 text-primary" />
            )}
            {t("ai.feedback.rated")}
          </span>
        ) : (
          <>
            <span className={cn("text-xs text-muted-foreground", submitting && "opacity-50")}>
              {t("ai.feedback.rate")}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className={selectedClass(true)}
              onClick={() => sendFeedback(true)}
              disabled={submitting}
              aria-label={t("ai.feedback.helpful")}
              title={t("ai.feedback.helpful")}
            >
              <ThumbsUp className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className={selectedClass(false)}
              onClick={() => sendFeedback(false)}
              disabled={submitting}
              aria-label={t("ai.feedback.not_helpful")}
              title={t("ai.feedback.not_helpful")}
            >
              <ThumbsDown className="size-3.5" />
            </Button>
            {state === "error" && (
              <span className="text-xs text-destructive">
                {t("ai.feedback.error")}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function registerKnowledgeSearchFeedbackRenderer() {
  registerToolRenderer({
    id: "arda.knowledge-search-feedback",
    match: (result) =>
      Array.isArray(result) &&
      result.length > 0 &&
      typeof result[0]?.runId === "string",
    component: KnowledgeSearchFeedback,
  })
}
