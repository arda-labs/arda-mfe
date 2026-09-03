import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { MessageSquare, RefreshCw, User, Bot, Wrench } from "lucide-react"
import { approvalsApi } from "../api"
import type { ConversationMessage, ConversationSummary } from "../types"

export function AuditTrail() {
  const { t, formatDate } = useI18n()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const list = await approvalsApi.listConversations(50)
      setConversations(list)
      if (list.length > 0 && !selectedThread) {
        setSelectedThread(list[0].threadId)
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false)
    }
  }, [selectedThread])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!selectedThread) return
    setLoadingMessages(true)
    approvalsApi
      .getConversationMessages(selectedThread, 100)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false))
  }, [selectedThread])

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <div className="space-y-2 lg:col-span-4">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("ai.approvals.audit.threads_title")}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={loadConversations}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading && conversations.length === 0 ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
            {t("ai.approvals.audit.no_threads")}
          </div>
        ) : (
          <div className="max-h-[600px] space-y-1.5 overflow-y-auto pr-1">
            {conversations.map((c) => (
              <button
                key={c.threadId}
                type="button"
                onClick={() => setSelectedThread(c.threadId)}
                className={`w-full rounded-lg border p-3 text-left transition-all ${
                  selectedThread === c.threadId
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border/60 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate text-xs font-medium">
                    {c.title || c.threadId}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {c.messageCount} msg
                  </span>
                </div>
                {c.lastMessageAt && (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {formatDate(c.lastMessageAt, {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4 lg:col-span-8">
        <div className="mb-3 flex items-center gap-2 border-b pb-3">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">
            {selectedThread
              ? t("ai.approvals.audit.inspecting", { thread: selectedThread })
              : t("ai.approvals.audit.select_thread")}
          </span>
        </div>

        {loadingMessages ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="ml-auto h-16 w-3/4" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
            {t("ai.approvals.audit.empty_messages")}
          </div>
        ) : (
          <div className="max-h-[540px] space-y-3 overflow-y-auto pr-2">
            {messages.map((m) => (
              <div
                key={m.sequence}
                className={`flex gap-3 rounded-lg border p-3 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "border-primary/20 bg-primary/5"
                    : m.role === "assistant"
                      ? "border-border/80 bg-muted/30"
                      : "border-border/40 bg-muted/60"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {m.role === "user" ? (
                    <User className="h-4 w-4 text-primary" />
                  ) : m.role === "assistant" ? (
                    <Bot className="h-4 w-4 text-primary" />
                  ) : (
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-semibold uppercase">{m.role}</span>
                    <span className="font-mono">
                      {formatDate(m.createdAt, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-xs">
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
