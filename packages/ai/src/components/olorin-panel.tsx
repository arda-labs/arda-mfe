import * as React from "react"
import {
  AuiIf,
  ThreadPrimitive,
  MessagePrimitive,
  ComposerPrimitive,
  ActionBarPrimitive,
  SelectionToolbarPrimitive,
  useMessageTiming,
  groupPartByType,
} from "@assistant-ui/react"
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
  Mic,
  Pencil,
  Plus,
  Quote,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react"
import {
  deleteConversation as apiDeleteConversation,
} from "../lib/conversations"
import {
  areDefaultRenderersRegistered,
  markDefaultRenderersRegistered,
  collectOlorinContext,
} from "../lib/registry"
import { registerCustomerSummaryRenderer } from "./tools/customer-summary-card"
import { registerEmployeeRenderer } from "./tools/employee-card"
import { registerFinanceAccountRenderer } from "./tools/finance-account-card"
import { registerInvoiceListRenderer } from "./tools/invoice-list-card"
import { registerKnowledgeCitationRenderer } from "./tools/citation-list"
import { registerKnowledgeSearchFeedbackRenderer } from "./tools/knowledge-search-feedback"
import { MarkdownMessage } from "./markdown"
import {
  SearchMetaToolUI,
  ExecuteMetaToolUI,
  GenericToolView,
} from "./tools/generic-tool-view"
import { AISettingsDialog } from "./ai-settings-dialog"
import { RunStatusBar, RunErrorBubble, ThinkingBubble } from "./status/run-status-bar"
import { useOlorinContext } from "../lib/context"

export type OlorinPanelProps = {
  className?: string
  showHeader?: boolean
}

if (!areDefaultRenderersRegistered()) {
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
  if (path.startsWith("/finance")) return ["customer", "knowledge"] as const
  if (path.startsWith("/hrm")) return ["customer", "knowledge"] as const
  if (path.startsWith("/workflow")) return ["knowledge", "customer"] as const
  if (path.startsWith("/customers") || path.startsWith("/workbench"))
    return ["customer", "knowledge"] as const
  if (path.startsWith("/admin")) return ["knowledge", "customer"] as const
  return ["customer", "knowledge"] as const
}

export function OlorinPanel({
  className,
  showHeader = true,
}: OlorinPanelProps) {
  const { t, formatDate } = useI18n()
  const { newThread, switchToThread, threadId, conversations } = useOlorinContext()
  const [settingsOpen, setSettingsOpen] = React.useState(false)

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
                      void apiDeleteConversation(conversation.threadId)
                        .then(() => {
                          // Deleting the thread currently open must reset the
                          // view — otherwise the panel keeps a dead thread.
                          if (conversation.threadId === threadId) newThread()
                          return conversations.refresh()
                        })
                        .catch(() => undefined)
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-1.5">
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

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label={t("ai.settings.title") || "Cài đặt AI"}
              title={t("ai.settings.title") || "Cài đặt AI"}
              className="size-7 rounded-md text-muted-foreground hover:text-foreground"
            >
              <Settings className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <ThreadPrimitive.Viewport className="relative flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">
          <ThreadPrimitive.Empty>
            <OlorinEmptyState />
          </ThreadPrimitive.Empty>

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
          <ThreadPrimitive.ScrollToBottom asChild>
            <Button
              type="button"
              size="icon"
              aria-label={t("ai.scroll.bottom") || "Xem tin nhắn mới nhất"}
              title={t("ai.scroll.bottom") || "Xem tin nhắn mới nhất"}
              className="sticky bottom-4 left-1/2 z-10 size-8 -translate-x-1/2 rounded-full border bg-background/90 shadow-lg backdrop-blur text-muted-foreground hover:text-foreground"
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

        <RunStatusBar />

        <ComposerPrimitive.Root className="border-t bg-background p-3">
          <div className="rounded-2xl border bg-card p-1.5 shadow-2xs transition focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/20">
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
              className="max-h-40 min-h-10 w-full resize-none border-0 bg-transparent px-2.5 py-1 text-sm shadow-none focus-visible:outline-hidden placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-0.5">
              <span className="text-[11px] text-muted-foreground">
                {t("ai.composer.hint")}
              </span>
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
                      aria-label="Dừng tạo"
                      title="Dừng tạo"
                      className="size-7.5 rounded-full shadow-2xs"
                    >
                      <Square className="size-3 fill-current" />
                    </Button>
                  </ComposerPrimitive.Cancel>
                </ThreadPrimitive.If>
              </div>
            </div>
          </div>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.Root>

      <AISettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      {/* Registered meta-tool UIs — mounted once so part.toolUI can resolve
          them by name inside GroupedParts. */}
      <SearchMetaToolUI />
      <ExecuteMetaToolUI />
    </div>
  )
}

function OlorinEmptyState() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3 shadow-xs ring-1 ring-primary/20">
        <Sparkles className="size-6" />
      </div>
      <p className="text-sm font-semibold tracking-tight">{t("ai.empty.title")}</p>
      <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
        {t("ai.empty.hint")}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-sm">
        {pageSuggestionKeys().map((key) => (
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
              className="h-7.5 rounded-full px-3 text-xs font-normal hover:bg-accent/80 transition-colors shadow-2xs"
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
  const context = collectOlorinContext()
  const displayName = typeof context.userDisplayName === "string" ? context.userDisplayName : ""
  const initials = getInitials(displayName) || "U"

  return (
    <MessagePrimitive.Root
      // User-owned text is not quotable — the selection toolbar only
      // surfaces for assistant content.
      data-aui-quote-selectable="false"
      className="group/message flex w-full justify-end py-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
    >
      <div className="flex max-w-[85%] flex-col items-end gap-1">
        <div className="flex items-end gap-2 flex-row-reverse">
          <div
            title={displayName || "Người dùng"}
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-2xs select-none"
          >
            {initials}
          </div>
          <div className="rounded-2xl rounded-br-xs bg-primary px-3.5 py-2 text-sm leading-relaxed text-primary-foreground shadow-2xs wrap-break-word">
            <MessagePrimitive.Content />
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100 pr-1">
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

function getInitials(name?: string): string | undefined {
  if (!name?.trim()) return undefined
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="group/message flex w-full justify-start py-1.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200">
      <div className="flex max-w-[90%] items-start gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground text-xs font-bold shadow-2xs ring-1 ring-primary/20">
          <Sparkles className="size-3.5" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* empty:hidden — the runtime creates the assistant message before
              the first content part arrives; hide the bare card so the
              ThinkingBubble skeleton is the single visible placeholder.
              data-aui-quote-selectable marks the prose region quotable —
              selections must stay inside it for the toolbar to appear. */}
          <div
            data-aui-quote-selectable=""
            className="rounded-2xl rounded-tl-xs border bg-card/90 px-4 py-3 text-sm leading-relaxed shadow-2xs text-foreground empty:hidden"
          >
            {/* GroupedParts + groupPartByType — the official chain-of-thought
                pattern: consecutive reasoning/tool-call parts fold into one
                collapsible thinking section (ChatGPT-style). */}
            <MessagePrimitive.GroupedParts
              groupBy={groupPartByType({
                // Group adjacent text parts into a single block so a streamed
                // answer split across multiple text parts doesn't render as
                // two separate bubbles while streaming.
                text: ["group-text"],
                reasoning: ["group-chainOfThought", "group-reasoning"],
                "tool-call": ["group-chainOfThought", "group-tool"],
              })}
            >
              {({ part, children }) => {
                switch (part.type) {
                  case "group-chainOfThought":
                    return <div className="mb-2">{children}</div>
                  case "group-text":
                    return <div className="space-y-1">{children}</div>
                  case "group-reasoning": {
                    const running = part.status.type === "running"
                    return (
                      <ReasoningRoot streaming={running}>
                        <ReasoningTrigger active={running} />
                        <ReasoningContent aria-busy={running}>
                          <ReasoningText>{children}</ReasoningText>
                        </ReasoningContent>
                      </ReasoningRoot>
                    )
                  }
                  case "group-tool":
                    return <div className="space-y-2">{children}</div>
                  case "text":
                    return <MarkdownMessage content={part.text ?? ""} />
                  case "reasoning":
                    return (
                      <MarkdownMessage
                        content={part.text ?? ""}
                        className="text-xs leading-relaxed text-muted-foreground"
                      />
                    )
                  case "indicator":
                    // Streaming with no renderable parts yet — the ThinkingBubble
                    // skeleton outside the card covers this.
                    return null
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
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover/message:opacity-100 pl-1">
            <ActionBarPrimitive.Root className="flex items-center gap-0.5">
              <ActionBarPrimitive.Copy asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground rounded"
                  title="Sao chép"
                >
                  <Copy className="size-3" />
                </Button>
              </ActionBarPrimitive.Copy>
              <ActionBarPrimitive.Reload asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground hover:text-foreground rounded"
                  title="Tạo lại"
                >
                  <RefreshCw className="size-3" />
                </Button>
              </ActionBarPrimitive.Reload>
            </ActionBarPrimitive.Root>
            <MessageTimingStats />
          </div>
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
