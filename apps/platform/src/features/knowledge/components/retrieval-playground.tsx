import { useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Clock,
  ExternalLink,
  Layers,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  FileSearch,
} from "lucide-react"
import { knowledgeApi, type QueryResponse } from "../api"

export function RetrievalPlayground({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [topK, setTopK] = useState("5")
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<QueryResponse | null>(null)
  const [feedbackSent, setFeedbackSent] = useState<Record<string, boolean>>({})

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    try {
      const res = await knowledgeApi.query({
        query: trimmed,
        top_k: Number(topK) || 5,
      })
      setResponse(res)
    } catch (err) {
      notify.error(
        t("platform.knowledge.playground.query_failed"),
        translateApiError(err)
      )
    } finally {
      setLoading(false)
    }
  }

  const handleFeedback = async (runId: string, helpful: boolean) => {
    try {
      await knowledgeApi.feedback({ run_id: runId, helpful })
      setFeedbackSent((prev) => ({ ...prev, [runId]: true }))
      notify.success(t("platform.knowledge.playground.feedback_sent"))
    } catch (err) {
      notify.error(
        t("platform.knowledge.playground.feedback_failed"),
        translateApiError(err)
      )
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col sm:max-w-xl w-full p-6">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <SheetTitle>{t("platform.knowledge.playground.title")}</SheetTitle>
          </div>
          <SheetDescription>
            {t("platform.knowledge.playground.description")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder={t("platform.knowledge.playground.placeholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !loading) {
                    void handleSearch()
                  }
                }}
                className="pr-8 text-xs"
              />
            </div>

            <Select value={topK} onValueChange={setTopK}>
              <SelectTrigger className="w-24 text-xs">
                <SelectValue placeholder="top_k" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Top 3</SelectItem>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="8">Top 8</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              disabled={loading || !query.trim()}
              onClick={() => void handleSearch()}
              className="shrink-0"
            >
              <Search className="mr-1.5 size-3.5" />
              {t("platform.knowledge.playground.search_btn")}
            </Button>
          </div>

          {response ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="size-3.5" />
                  {response.latency_ms} ms
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="size-3.5" />
                  {response.retrieved_count} candidates &rarr; {response.reranked_count} hits
                </span>
              </div>

              {!feedbackSent[response.run_id] ? (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] mr-1">
                    {t("platform.knowledge.playground.helpful_prompt")}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-emerald-600"
                    onClick={() => void handleFeedback(response.run_id, true)}
                  >
                    <ThumbsUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-6 text-muted-foreground hover:text-rose-600"
                    onClick={() => void handleFeedback(response.run_id, false)}
                  >
                    <ThumbsDown className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <span className="text-[11px] text-emerald-600 font-medium">
                  {t("platform.knowledge.playground.feedback_thank_you")}
                </span>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Search className="size-6 animate-pulse" />
              <p className="text-xs">{t("platform.knowledge.playground.searching")}</p>
            </div>
          ) : !response ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <FileSearch className="size-8 opacity-30" />
              <p className="text-xs">{t("platform.knowledge.playground.empty_hint")}</p>
            </div>
          ) : response.hits.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <FileSearch className="size-8 opacity-30" />
              <p className="text-xs font-medium">{t("platform.knowledge.playground.no_results")}</p>
              <p className="text-[11px] text-muted-foreground/80 max-w-xs">
                {t("platform.knowledge.playground.no_results_tip")}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-280px)] pr-3">
              <div className="space-y-3 pb-6">
                {response.hits.map((hit, idx) => (
                  <div
                    key={`${hit.source_id}-${hit.source_version_id}-${idx}`}
                    className="rounded-lg border bg-card p-3.5 text-xs shadow-xs transition-colors hover:border-primary/50"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                          #{idx + 1}
                        </Badge>
                        <span className="font-medium text-foreground truncate max-w-[200px]">
                          {hit.title}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          v{hit.version}
                        </Badge>
                      </div>

                      <Badge variant="default" className="text-[10px] font-mono">
                        RRF: {hit.score.toFixed(4)}
                      </Badge>
                    </div>

                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ExternalLink className="size-3" />
                      <span className="font-mono text-primary font-medium">{hit.citation}</span>
                    </div>

                    <p className="rounded-md bg-muted/30 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground whitespace-pre-wrap">
                      {hit.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
