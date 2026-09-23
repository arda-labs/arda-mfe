import {
  AuiIf,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
  SelectionToolbarPrimitive,
  useMessageTiming,
  useAuiState,
  groupPartByType,
  type GroupByContext,
  type PartState,
} from "@assistant-ui/react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
} from "./reasoning"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  ArrowDown,
  ChevronDown,
  Copy,
  History,
  LoaderCircle,
  Mic,
  MoveHorizontal,
  Pencil,
  Plus,
  Quote,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from "lucide-react"
import {
  deleteConversation as apiDeleteConversation,
  restoreConversation,
  sendAnswerFeedback,
} from "../lib/conversations"
import {
  areDefaultRenderersRegistered,
  markDefaultRenderersRegistered,
  resolveToolRenderer,
} from "../lib/registry"
import { registerCustomerSummaryRenderer } from "./tools/customer-summary-card"
import { registerEmployeeRenderer } from "./tools/employee-card"
import { registerFinanceAccountRenderer } from "./tools/finance-account-card"
import { registerInvoiceListRenderer } from "./tools/invoice-list-card"
import { registerKnowledgeCitationRenderer } from "./tools/citation-list"
import { registerKnowledgeSearchFeedbackRenderer } from "./tools/knowledge-search-feedback"
import { registerChartRenderer } from "./tools/chart-card"
import { registerKpiRenderer } from "./tools/kpi-grid-card"
import { registerReportPresentationRenderer } from "./tools/report-presentation-card"
import { MarkdownMessage } from "./markdown"
import {
  SearchMetaToolUI,
  ExecuteMetaToolUI,
  GenericToolView,
} from "./tools/generic-tool-view"
import { RenderChartToolUI } from "./tools/render-chart-tool-ui"
import { isArrayResult } from "./tools/data-table-view"
import { DeleteConversationDialog } from "./conversation-delete-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { RunErrorBubble, ThinkingBubble } from "./status/run-status-bar"
import { ActivityGroup } from "./activity"
import { useOlorinContext } from "../lib/context"

export type OlorinPanelProps = {
  className?: string
  showHeader?: boolean
}

if (!areDefaultRenderersRegistered()) {
  registerReportPresentationRenderer()
  registerKpiRenderer()
  registerChartRenderer()
  registerCustomerSummaryRenderer()
  registerEmployeeRenderer()
  registerFinanceAccountRenderer()
  registerInvoiceListRenderer()
  registerKnowledgeCitationRenderer()
  registerKnowledgeSearchFeedbackRenderer()
  markDefaultRenderersRegistered()
}

// Suggestions adapt to the module the user is in. Falls back to the default
// pair on unknown routes.
function pageSuggestionKeys(): readonly string[] {
  const path = typeof window !== "undefined" ? window.location.pathname : ""
  if (path.startsWith("/loans") || path.startsWith("/finance") || path.startsWith("/statistical"))
    return ["report", "alerts", "customer"] as const
  if (path.startsWith("/customers") || path.startsWith("/workbench"))
    return ["customer", "report", "knowledge"] as const
  if (path.startsWith("/hrm")) return ["customer", "knowledge", "report"] as const
  return ["report", "alerts", "knowledge"] as const
}

export function OlorinPanel({
  className,
  showHeader = true,
}: OlorinPanelProps) {
  const { t, formatDate } = useI18n()
  const { newThread, switchToThread, threadId, conversations } = useOlorinContext()
  const isEmpty = useAuiState((state) => state.thread.messages.length === 0)

  // Chat width: content-width (default, matches the message column) or full
  // width. Persisted so the choice survives a reload.
  const [wideChat, setWideChat] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      return window.localStorage.getItem("arda-ai-wide-chat") === "1"
    } catch {
      return false
    }
  })
  const toggleWideChat = useCallback(() => {
    setWideChat((value) => {
      const next = !value
      try {
        window.localStorage.setItem("arda-ai-wide-chat", next ? "1" : "0")
      } catch {
        // storage may be unavailable; the in-memory value still works
      }
      return next
    })
  }, [])

  const [pendingDelete, setPendingDelete] = useState<{ threadId: string; title: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [lastDeleted, setLastDeleted] = useState<{ threadId: string; title: string } | null>(null)

  // The undo affordance fades on its own; the trash view remains the durable
  // way to restore.
  useEffect(() => {
    if (!lastDeleted) return
    const timer = window.setTimeout(() => setLastDeleted(null), 8000)
    return () => window.clearTimeout(timer)
  }, [lastDeleted])

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return
    setDeleting(true)
    const target = pendingDelete
    try {
      await apiDeleteConversation(target.threadId)
      if (target.threadId === threadId) newThread()
      await conversations.refresh()
      setLastDeleted(target)
      setPendingDelete(null)
    } catch {
      // Keep the dialog open so the user can retry.
    } finally {
      setDeleting(false)
    }
  }, [pendingDelete, threadId, newThread, conversations])

  const undoDelete = useCallback(async () => {
    if (!lastDeleted) return
    const target = lastDeleted
    setLastDeleted(null)
    try {
      await restoreConversation(target.threadId)
      await conversations.refresh()
    } catch {
      // The trash view still offers restore.
    }
  }, [lastDeleted, conversations])

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col bg-background text-foreground", className)}>
      {showHeader && (
        <div className="flex h-11 shrink-0 items-center justify-between border-b px-3 bg-muted/20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-xs font-medium max-w-[220px]"
              >
                <History className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {conversations.list.find((c) => c.threadId === threadId)?.title ||
                    t("ai.threads.history")}
                </span>
                <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel className="text-xs">{t("ai.threads.title")}</DropdownMenuLabel>
              {conversations.list.length === 0 && !conversations.loading && (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {t("ai.threads.empty")}
                </DropdownMenuItem>
              )}
              {!conversations.list.some((c) => c.threadId === threadId) && (
                <DropdownMenuItem disabled className="flex items-center gap-2 bg-accent text-xs py-2 font-medium text-accent-foreground">
                  <span className="min-w-0 flex-1 truncate">
                    {t("ai.threads.current_new") || "Cuộc trò chuyện mới"}
                  </span>
                </DropdownMenuItem>
              )}
              {conversations.list.map((conversation) => (
                <DropdownMenuItem
                  key={conversation.threadId}
                  onSelect={() => switchToThread(conversation.threadId)}
                  className={cn(
                    "flex items-center gap-2 text-xs py-2",
                    conversation.threadId === threadId && "bg-accent text-accent-foreground font-medium"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {conversation.title || conversation.threadId}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {conversation.messageCount} {t("ai.threads.messages_suffix")}
                      {conversation.lastMessageAt &&
                        ` · ${formatDate(conversation.lastMessageAt, {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={t("ai.threads.delete")}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                    onClick={(event) => {
                      event.stopPropagation()
                      setPendingDelete({
                        threadId: conversation.threadId,
                        title: conversation.title,
                      })
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1.5">
            <HeaderActivity />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleWideChat}
              className="size-7 text-muted-foreground hover:text-foreground"
              aria-label={wideChat ? t("ai.panel.chat_width_compact") : t("ai.panel.chat_width_full")}
              title={wideChat ? t("ai.panel.chat_width_compact") : t("ai.panel.chat_width_full")}
            >
              <MoveHorizontal className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => newThread()}
              className="h-7 gap-1 px-2 text-xs rounded-md shadow-2xs"
            >
              <Plus className="size-3.5" />
              <span>{t("ai.threads.new")}</span>
            </Button>
          </div>
        </div>
      )}

      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-auto scroll-smooth">
          <ThreadPrimitive.Empty>
            <OlorinWelcome wide={wideChat} />
          </ThreadPrimitive.Empty>

          <div
            className={cn(
              "mx-auto w-full space-y-3 px-4 py-4 transition-[max-width] duration-300",
              wideChat ? "max-w-none" : "max-w-3xl"
            )}
          >
            <ThreadPrimitive.Messages>
              {({ message }) => {
                if (message.role === "user") {
                  if (message.composer.isEditing) return <UserEditComposer />;
                  return <UserMessage />;
                }
                return <AssistantMessage />;
              }}
            </ThreadPrimitive.Messages>

            <ThinkingBubble />
            <RunErrorBubble />
          </div>

          <ThreadPrimitive.ScrollToBottom asChild>
            <Button
              type="button"
              size="icon"
              aria-label={t("ai.scroll.bottom") || "Xem tin nhắn mới nhất"}
              title={t("ai.scroll.bottom") || "Xem tin nhắn mới nhất"}
              className="sticky bottom-4 z-10 mx-auto size-8 rounded-full border bg-background/90 shadow-lg backdrop-blur text-muted-foreground hover:text-foreground"
            >
              <ArrowDown className="size-4" />
            </Button>
          </ThreadPrimitive.ScrollToBottom>
        </ThreadPrimitive.Viewport>

        <SelectionToolbarPrimitive.Root className="z-50 flex items-center gap-1 rounded-lg border bg-popover px-1 py-1 shadow-md">
          <SelectionToolbarPrimitive.Quote className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-popover-foreground text-sm hover:bg-accent">
            <Quote className="size-3.5" />
            {t("ai.selection.quote") || "Trích dẫn"}
          </SelectionToolbarPrimitive.Quote>
        </SelectionToolbarPrimitive.Root>

        {!isEmpty && (
          <div className="bg-gradient-to-t from-background via-background/95 to-transparent px-4 pb-3 pt-4">
            <div
              className={cn(
                "mx-auto w-full transition-[max-width] duration-300",
                wideChat ? "max-w-none" : "max-w-3xl"
              )}
            >
              <OlorinComposer />
            </div>
          </div>
        )}
      </ThreadPrimitive.Root>

      {/* Registered meta-tool UIs — mounted once so part.toolUI can resolve
          them by name inside GroupedParts. */}
      <SearchMetaToolUI />
      <ExecuteMetaToolUI />
      <RenderChartToolUI />

      <DeleteConversationDialog
        open={pendingDelete !== null}
        title={pendingDelete?.title}
        busy={deleting}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        onConfirm={() => void confirmDelete()}
      />

      {lastDeleted && (
        <div className="fixed bottom-4 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-3 rounded-full border bg-popover px-3 py-1.5 text-xs shadow-lg">
          <span className="text-muted-foreground">{t("ai.threads.deleted")}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-2 text-[11px]"
            onClick={() => void undoDelete()}
          >
            <RotateCcw className="size-3" />
            {t("ai.threads.undo")}
          </Button>
        </div>
      )}
    </div>
  )
}

// The composer is shared by the docked (conversation) and centered (welcome)
// layouts, so it lives in one place.
function OlorinComposer() {
  const { t } = useI18n()
  const { actMode, setActMode } = useOlorinContext()
  const [actWarningOpen, setActWarningOpen] = useState(false)
  return (
    <ComposerPrimitive.Root className="w-full">
      {actMode && (
        <div className="mb-1.5 flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          <ShieldAlert className="size-3.5 shrink-0" />
          <span>
            {t("ai.mode.act_banner") ||
              "Chế độ Thực hiện — thao tác sẽ chạy ngay khi bạn có quyền."}
          </span>
        </div>
      )}
          <div className="rounded-[1.75rem] border bg-card p-1.5 shadow-2xs transition focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/20">
            <ComposerPrimitive.Quote className="mx-2 mt-1.5 mb-0.5">
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/60 px-2.5 py-1.5">
                <Quote className="size-3 shrink-0 text-muted-foreground" />
                <ComposerPrimitive.QuoteText className="min-w-0 flex-1 truncate text-xs text-muted-foreground" />
                <ComposerPrimitive.QuoteDismiss asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t("ai.composer.quote_dismiss") || "Bỏ trích dẫn"}
                    title={t("ai.composer.quote_dismiss") || "Bỏ trích dẫn"}
                    className="size-5 shrink-0 rounded text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-3" />
                  </Button>
                </ComposerPrimitive.QuoteDismiss>
              </div>
            </ComposerPrimitive.Quote>
            <ComposerPrimitive.Input
              rows={1}
              autoFocus
              placeholder={t("ai.composer.placeholder")}
              className="max-h-40 min-h-10 w-full resize-none border-0 bg-transparent px-3.5 py-1 text-sm shadow-none focus-visible:outline-hidden placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between gap-1.5 px-2 pt-1 pb-0.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 rounded-full px-2 text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (actMode) setActMode(false)
                  else setActWarningOpen(true)
                }}
                title={actMode ? t("ai.mode.act") : t("ai.mode.ask")}
              >
                {actMode ? <ShieldAlert className="size-3" /> : <ShieldCheck className="size-3" />}
                {actMode ? t("ai.mode.act") : t("ai.mode.ask")}
              </Button>
              <div className="flex items-center gap-1.5">
                <AuiIf condition={(s) => s.composer.dictation == null}>
                  <ComposerPrimitive.Dictate asChild>
                    <Button
                      type="button"
                      size="icon"
                      aria-label={t("ai.composer.dictate") || "Nhập liệu bằng giọng nói"}
                      title={t("ai.composer.dictate") || "Nhập liệu bằng giọng nói"}
                      className="size-7.5 rounded-full shadow-2xs text-muted-foreground"
                    >
                      <Mic className="size-3.5" />
                    </Button>
                  </ComposerPrimitive.Dictate>
                </AuiIf>
                <AuiIf condition={(s) => s.composer.dictation != null}>
                  <ComposerPrimitive.StopDictation asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      aria-label={t("ai.composer.stop_dictation") || "Dừng nhập liệu"}
                      title={t("ai.composer.stop_dictation") || "Dừng nhập liệu"}
                      className="size-7.5 rounded-full shadow-2xs"
                    >
                      <Square className="size-3 fill-current motion-safe:animate-pulse" />
                    </Button>
                  </ComposerPrimitive.StopDictation>
                </AuiIf>
                <ThreadPrimitive.If running={false}>
                  <ComposerPrimitive.Send asChild>
                    <Button
                      type="submit"
                      size="icon"
                      aria-label={t("ai.composer.send")}
                      className="size-7.5 rounded-full shadow-2xs"
                    >
                      <Send className="size-3.5" />
                    </Button>
                  </ComposerPrimitive.Send>
                </ThreadPrimitive.If>
                <ThreadPrimitive.If running={true}>
                  <ComposerPrimitive.Cancel asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      aria-label={t("ai.composer.stop")}
                      title={t("ai.composer.stop")}
                      className="size-7.5 rounded-full shadow-2xs"
                    >
                      <Square className="size-3 fill-current" />
                    </Button>
                  </ComposerPrimitive.Cancel>
                </ThreadPrimitive.If>
              </div>
            </div>
          </div>
      <AlertDialog open={actWarningOpen} onOpenChange={setActWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("ai.mode.warning_title") || "Bật chế độ Thực hiện?"}
            </AlertDialogTitle>
            <AlertDialogDescription>{t("ai.mode.warning_body")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("ai.mode.cancel") || "Huỷ"}</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                onClick={() => {
                  setActMode(true)
                  setActWarningOpen(false)
                }}
              >
                {t("ai.mode.confirm") || "Bật chế độ Thực hiện"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ComposerPrimitive.Root>
  )
}

// Live "what is it doing" hint for the header, driven by the running tool of
// the last assistant message. Kept tiny so it reads as ambient status.
const HEADER_ACTIVITY_KEYS: Record<string, string> = {
  search: "ai.activity.search",
  execute: "ai.activity.execute",
  readResult: "ai.activity.read",
}

function HeaderActivity() {
  const { t } = useI18n()
  const running = useAuiState((state) => state.thread.isRunning)
  const toolName = useAuiState((state) => {
    if (!state.thread.isRunning) return undefined
    const messages = state.thread.messages
    const last = messages[messages.length - 1]
    if (!last || last.role !== "assistant") return undefined
    const pending = last.content.find(
      (part) => part.type === "tool-call" && (part as { result?: unknown }).result === undefined
    )
    const name = (pending as { toolName?: unknown } | undefined)?.toolName
    return typeof name === "string" ? name : undefined
  })

  if (!running) return null
  const label = t(HEADER_ACTIVITY_KEYS[toolName ?? ""] ?? "ai.activity.working")
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200">
      <LoaderCircle className="size-3 shrink-0 animate-spin text-primary" />
      <span className="shimmer max-w-[140px] truncate motion-reduce:animate-none">{label}</span>
    </span>
  )
}

function OlorinWelcome({ wide = false }: { wide?: boolean }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
      <div className="relative mb-4">
        <div
          className="absolute inset-0 -z-10 rounded-full bg-primary/20 blur-2xl motion-safe:animate-pulse"
          aria-hidden="true"
        />
        <div className="flex size-14 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 via-primary/10 to-brand-accent/10 text-primary shadow-xs ring-1 ring-primary/20 motion-safe:animate-in motion-safe:zoom-in-90 motion-safe:duration-300">
          <Sparkles className="size-7" />
        </div>
      </div>
      <p className="text-xl font-semibold tracking-tight">{t("ai.empty.title")}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t("ai.empty.hint")}
      </p>

      <div
        className={cn(
          "mt-6 w-full text-left transition-[max-width] duration-300",
          wide ? "max-w-none" : "max-w-2xl"
        )}
      >
        <OlorinComposer />
      </div>

      <div className="mt-5 flex max-w-2xl flex-wrap justify-center gap-2">
        {pageSuggestionKeys().map((key, index) => (
          <ThreadPrimitive.Suggestion
            key={key}
            prompt={t(`ai.suggestions.${key}`)}
            method="replace"
            autoSend
            asChild
          >
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-full px-4 text-xs font-normal shadow-2xs transition-all hover:-translate-y-0.5 hover:shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {t(`ai.suggestions.${key}`)}
            </Button>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  )
}

function UserMessage() {
  const { t } = useI18n()

  return (
    <MessagePrimitive.Root
      // User-owned text is not quotable — the selection toolbar only
      // surfaces for assistant content.
      data-aui-quote-selectable="false"
      className="group/message flex w-full justify-end py-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
    >
      <div className="flex max-w-[85%] flex-col items-end gap-1">
        <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground shadow-2xs wrap-break-word">
          <MessagePrimitive.Content />
        </div>
        <div className="flex items-center gap-1 opacity-100 transition-opacity pr-1 md:opacity-0 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100">
          <ActionBarPrimitive.Root className="flex items-center gap-0.5">
            <ActionBarPrimitive.Edit asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-foreground rounded"
                title={t("ai.edit.title") || "Sửa tin nhắn"}
              >
                <Pencil className="size-3" />
              </Button>
            </ActionBarPrimitive.Edit>
          </ActionBarPrimitive.Root>
        </div>
      </div>
    </MessagePrimitive.Root>
  )
}

function UserEditComposer() {
  const { t } = useI18n()
  return (
    <MessagePrimitive.Root className="flex w-full justify-end py-1.5">
      <div className="flex max-w-[85%] flex-col items-end gap-1">
        <ComposerPrimitive.Root className="w-full rounded-2xl border bg-card p-1.5 shadow-2xs transition focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/20">
          <ComposerPrimitive.Input
            rows={2}
            autoFocus
            placeholder={t("ai.edit.placeholder") || "Chỉnh sửa tin nhắn…"}
            className="max-h-40 min-h-10 w-full resize-none border-0 bg-transparent px-2.5 py-1 text-sm shadow-none focus-visible:outline-hidden placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-end gap-1.5 px-2 pt-1 pb-0.5">
            <ComposerPrimitive.Cancel asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {t("ai.edit.cancel") || "Huỷ"}
              </Button>
            </ComposerPrimitive.Cancel>
            <ComposerPrimitive.Send asChild>
              <Button type="submit" size="sm" className="h-7 px-3 text-xs">
                {t("ai.edit.save") || "Lưu"}
              </Button>
            </ComposerPrimitive.Send>
          </div>
        </ComposerPrimitive.Root>
      </div>
    </MessagePrimitive.Root>
  )
}

// A tool result that resolves to a rich view (report presentation, chart, KPI
// grid, customer card, or a data table) is an artifact, not a processing step.
// Returning an empty group path keeps it out of the collapsible activity group
// so it stays visible after the turn settles — for live runs and history alike.
function isArtifactPart(part: PartState): boolean {
  if (part.type !== "tool-call") return false
  const result: unknown = part.result
  if (typeof result !== "object" || result === null) return false
  const payload = part.toolName === "execute" ? (result as Record<string, unknown>).output : result
  if (Array.isArray(payload)) return isArrayResult(payload)
  if (typeof payload === "object" && payload !== null) {
    return Boolean(resolveToolRenderer(payload as Record<string, unknown>))
  }
  return false
}

function AssistantMessage() {
  const { t } = useI18n()
  const { threadId } = useOlorinContext()
  const [rating, setRating] = useState<"up" | "down" | null>(null)

  const rate = (helpful: boolean) => {
    setRating(helpful ? "up" : "down")
    void sendAnswerFeedback({ threadId, helpful }).catch(() => setRating(null))
  }

  const baseGroupBy = useMemo(
    () =>
      groupPartByType({
        // Group adjacent text parts into a single block so a streamed answer
        // split across multiple text parts doesn't render as two bubbles.
        text: ["group-text"],
        reasoning: ["group-chainOfThought", "group-reasoning"],
        "tool-call": ["group-chainOfThought", "group-tool"],
        // Tools whose UI opts into `display: "standalone"` (the chart renderer)
        // stay outside the collapsible activity group.
        "standalone-tool-call": [],
      }),
    []
  )

  const groupBy = useCallback(
    (part: PartState, context: GroupByContext) => {
      if (isArtifactPart(part)) return []
      return baseGroupBy(part, context)
    },
    [baseGroupBy]
  )

  return (
    <MessagePrimitive.Root className="group/message flex w-full justify-start py-2 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
      <div className="min-w-0 flex-1 space-y-1.5">
          {/* empty:hidden — the runtime creates the assistant message before
              the first content part arrives; hide the bare card so the
              ThinkingBubble skeleton is the single visible placeholder.
              data-aui-quote-selectable marks the prose region quotable —
              selections must stay inside it for the toolbar to appear. */}
          <div
            data-aui-quote-selectable=""
            className="py-0.5 text-sm leading-relaxed text-foreground empty:hidden"
          >
            {/* GroupedParts + groupPartByType — the official chain-of-thought
                pattern: consecutive reasoning/tool-call parts fold into one
                ChatGPT-style activity disclosure. */}
            <MessagePrimitive.GroupedParts groupBy={groupBy}>
              {({ part, children }) => {
                switch (part.type) {
                  case "group-chainOfThought":
                    return (
                      <ActivityGroup running={part.status?.type === "running"}>
                        {children}
                      </ActivityGroup>
                    )
                  case "group-text":
                    return <div className="space-y-1">{children}</div>
                  case "group-reasoning": {
                    const running = part.status?.type === "running"
                    return (
                      <ReasoningRoot streaming={running} variant="ghost">
                        <ReasoningTrigger
                          active={running}
                          label={t("ai.message.reasoning")}
                        />
                        <ReasoningContent aria-busy={running}>
                          <ReasoningText>{children}</ReasoningText>
                        </ReasoningContent>
                      </ReasoningRoot>
                    )
                  }
                  case "group-tool":
                    return <div className="space-y-1">{children}</div>
                  case "text":
                    return (
                      <MarkdownMessage
                        content={part.text ?? ""}
                        streaming={part.status?.type === "running"}
                      />
                    )
                  case "reasoning":
                    return (
                      <MarkdownMessage
                        content={part.text ?? ""}
                        className="text-xs leading-relaxed text-muted-foreground"
                      />
                    )
                  case "indicator":
                    // Streaming with no renderable parts yet: a compact inline
                    // status row (the external ThinkingBubble covers the window
                    // before the assistant message exists).
                    return (
                      <div className="flex items-center gap-2 py-0.5 text-xs text-muted-foreground">
                        <LoaderCircle className="size-3.5 shrink-0 animate-spin text-primary" />
                        <span className="shimmer font-medium motion-reduce:animate-none">
                          {t("ai.activity.working")}
                        </span>
                      </div>
                    )
                  case "tool-call": {
                    // Meta tools (search/execute) register via the mounted
                    // makeAssistantToolUI components below; part.toolUI resolves
                    // them. Anything else falls back to the generic view.
                    return (
                      part.toolUI ?? (
                        <GenericToolView
                          toolName={part.toolName}
                          result={part.result as Record<string, unknown>}
                        />
                      )
                    )
                  }
                  default:
                    return null
                }
              }}
            </MessagePrimitive.GroupedParts>
          </div>
          <div className="flex items-center gap-1 opacity-100 transition-opacity pl-1 md:opacity-0 md:group-hover/message:opacity-100 md:group-focus-within/message:opacity-100">
            <ActionBarPrimitive.Root className="flex items-center gap-0.5">
              <ActionBarPrimitive.Copy asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground rounded"
                  aria-label={t("ai.message.copy")}
                  title={t("ai.message.copy")}
                >
                  <Copy className="size-3" />
                </Button>
              </ActionBarPrimitive.Copy>
              <ActionBarPrimitive.Reload asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground rounded"
                  aria-label={t("ai.message.regenerate")}
                  title={t("ai.message.regenerate")}
                >
                  <RefreshCw className="size-3" />
                </Button>
              </ActionBarPrimitive.Reload>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-6 rounded",
                  rating === "up" ? "text-emerald-600" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={t("ai.feedback.helpful") || "Hữu ích"}
                title={t("ai.feedback.helpful") || "Hữu ích"}
                onClick={() => rate(true)}
              >
                <ThumbsUp className="size-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-6 rounded",
                  rating === "down" ? "text-destructive" : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={t("ai.feedback.not_helpful") || "Không hữu ích"}
                title={t("ai.feedback.not_helpful") || "Không hữu ích"}
                onClick={() => rate(false)}
              >
                <ThumbsDown className="size-3" />
              </Button>
            </ActionBarPrimitive.Root>
            <MessageTimingStats />
          </div>
      </div>
    </MessagePrimitive.Root>
  )
}

// Stream metrics (duration, tok/s, TTFT) tracked automatically by the AG-UI
// run aggregator — no custom timers.
function MessageTimingStats() {
  const timing = useMessageTiming()
  if (!timing?.totalStreamTime) return null

  const formatMs = (ms: number) =>
    ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(2)}s`

  return (
    <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
      {formatMs(timing.totalStreamTime)}
      {timing.tokensPerSecond !== undefined &&
        ` · ${timing.tokensPerSecond.toFixed(1)} tok/s`}
    </span>
  )
}
