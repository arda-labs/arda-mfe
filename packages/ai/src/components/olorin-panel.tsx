import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
} from "@workspace/ui/components/message"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@workspace/ui/components/message-scroller"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Check,
  ChevronDown,
  Copy,
  History,
  Plus,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react"
import {
  deleteConversation as apiDeleteConversation,
  fetchConversationMessages,
  useOlorinConversations,
} from "../conversations"
import { olorinFixtures, type FixtureMessage } from "../fixtures"
import {
  extractApprovalProposal,
  messageText,
  parseToolResult,
  type OlorinMessage,
  type ToolResultPayload,
} from "../messages"
import {
  areDefaultRenderersRegistered,
  markDefaultRenderersRegistered,
  resolveToolRenderer,
} from "../registry"
import { registerCustomerSummaryRenderer } from "./customer-summary-card"
import { registerKnowledgeCitationRenderer } from "./citation-list"
import { ApprovalCard } from "./approval-card"
import { useOlorin } from "../use-olorin"

export type OlorinPanelProps = {
  className?: string
  fixtureKey?: string
  showHeader?: boolean
}

if (!areDefaultRenderersRegistered()) {
  registerCustomerSummaryRenderer()
  registerKnowledgeCitationRenderer()
  markDefaultRenderersRegistered()
}

const suggestionKeys = ["customer", "knowledge"] as const

export function OlorinPanel({ className, fixtureKey, showHeader = true }: OlorinPanelProps) {
  const { t, formatDate } = useI18n()
  const { messages, isReady, isRunning, send, newThread, switchToThread } = useOlorin()
  const [input, setInput] = useState("")
  const [error, setError] = useState("")
  const conversations = useOlorinConversations(!fixtureKey)
  const prevRunningRef = useRef(false)

  useEffect(() => {
    if (prevRunningRef.current && !isRunning) {
      void conversations.refresh()
    }
    prevRunningRef.current = isRunning
  }, [isRunning, conversations])

  const fixtureMessages = useMemo<FixtureMessage[] | undefined>(() => {
    if (!fixtureKey) return undefined
    return olorinFixtures[fixtureKey]
  }, [fixtureKey])

  const displayMessages: Array<OlorinMessage | FixtureMessage> =
    fixtureMessages ?? messages

  const statusLabel = fixtureMessages
    ? t("ai.fixture.notice")
    : !isReady
      ? t("ai.status.connecting")
      : isRunning
        ? t("ai.status.working")
        : error
          ? t("ai.status.error")
          : displayMessages.length > 0
            ? t("ai.status.done")
            : t("ai.status.ready")

  async function submit() {
    if (fixtureMessages) return
    const content = input.trim()
    if (!content || isRunning || !isReady) return
    setInput("")
    setError("")
    try {
      await send(content)
    } catch (caught) {
      setInput(content)
      setError(caught instanceof Error ? caught.message : t("ai.error.connection"))
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    void submit()
  }

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-col", className)}>
      {showHeader && !fixtureMessages && (
        <div className="flex items-center gap-1.5 border-b px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="sm">
                <History className="mr-1.5 size-3.5" />
                {t("ai.threads.title")}
                <ChevronDown className="ml-1 size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <DropdownMenuLabel>{t("ai.threads.title")}</DropdownMenuLabel>
              {conversations.conversations.length === 0 && !conversations.loading && (
                <DropdownMenuItem disabled>
                  {t("ai.threads.empty")}
                </DropdownMenuItem>
              )}
              {conversations.conversations.map((conversation) => (
                <DropdownMenuItem
                  key={conversation.threadId}
                  onSelect={() => {
                    void fetchConversationMessages(conversation.threadId)
                      .then((items) =>
                        switchToThread(
                          conversation.threadId,
                          items.map((item) => ({
                            id: `history-${item.sequence}`,
                            role: item.role,
                            content: item.content,
                          }))
                        )
                      )
                      .catch(() => undefined)
                  }}
                  className="items-center gap-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block w-full truncate text-sm font-medium">
                      {conversation.title || conversation.threadId}
                    </span>
                    <span className="block text-xs text-muted-foreground">
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
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={t("ai.threads.delete")}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={(event) => {
                      event.stopPropagation()
                      void apiDeleteConversation(conversation.threadId)
                        .then(() => conversations.refresh())
                        .catch(() => undefined)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.stopPropagation()
                        void apiDeleteConversation(conversation.threadId)
                          .then(() => conversations.refresh())
                          .catch(() => undefined)
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => newThread()}
          >
            <Plus className="mr-1 size-3.5" />
            {t("ai.threads.new")}
          </Button>
        </div>
      )}
      <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport aria-label={t("ai.transcript.label")}>
          <MessageScrollerContent className="p-4" aria-busy={isRunning}>
            {!fixtureMessages && displayMessages.length === 0 ? (
              <OlorinEmptyState onSuggestion={(value) => void send(value)} />
            ) : (
              displayMessages.map((message) => (
                <OlorinRow key={message.id} message={message} />
              ))
            )}
          </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <form onSubmit={onSubmit} className="border-t bg-background p-3">
        {error && (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="rounded-2xl border bg-card transition focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/30">
          <Textarea
            aria-label={t("ai.composer.label")}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                void submit()
              }
            }}
            placeholder={t("ai.composer.placeholder")}
            disabled={!isReady || isRunning || Boolean(fixtureMessages)}
            className="max-h-40 min-h-11 flex-1 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            rows={1}
          />
          <div className="flex items-center justify-between gap-2 px-2.5 pb-2">
            <p className="min-w-0 truncate text-[11px] text-muted-foreground">
              {statusLabel}
              {" · "}
              {t("ai.composer.hint")}
            </p>
            <Button
              type="submit"
              size="icon"
              aria-label={t("ai.composer.send")}
              disabled={!input.trim() || isRunning || !isReady || Boolean(fixtureMessages)}
              className="size-8 shrink-0 rounded-full"
            >
              {isRunning ? <Spinner /> : <Send />}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

function OlorinEmptyState({ onSuggestion }: { onSuggestion: (value: string) => void }) {
  const { t } = useI18n()
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-6" />
      </div>
      <div className="space-y-1.5">
        <p className="font-semibold">{t("ai.empty.title")}</p>
        <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
          {t("ai.empty.hint")}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestionKeys.map((key) => (
          <Button
            key={key}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onSuggestion(t(`ai.suggestions.${key}`))}
          >
            {t(`ai.suggestions.${key}`)}
          </Button>
        ))}
      </div>
    </div>
  )
}

function OlorinRow({
  message,
}: {
  message: OlorinMessage | FixtureMessage
}) {
  const { t } = useI18n()
  const isUser = message.role === "user"
  const toolResult = parseToolResult(message as OlorinMessage)
  const content = messageText(message.content)

  return (
    <MessageScrollerItem messageId={message.id} scrollAnchor={isUser}>
      <Message align={isUser ? "end" : "start"} className="group/message py-2">
        <MessageAvatar>
          <Avatar className="size-8">
            <AvatarFallback>{isUser ? "Bạn" : "OL"}</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent className="max-w-[85%]">
          {!isUser && (
            <MessageHeader>{t("ai.message.header")}</MessageHeader>
          )}
          {message.role === "tool" ? (
            <ToolResultBody result={toolResult} messageId={message.id} />
          ) : isUser ? (
            <Bubble isUser>{content}</Bubble>
          ) : content ? (
            <AssistantBubble content={content} />
          ) : (
            <TypingDots />
          )}
          {toolResult && message.role === "tool" && (
            <ApprovalSection result={toolResult} />
          )}
          {!isUser && message.role !== "tool" && (
            <MessageFooter className="gap-2 opacity-0 transition-opacity group-hover/message:opacity-100">
              <CopyButton text={content} />
            </MessageFooter>
          )}
        </MessageContent>
      </Message>
    </MessageScrollerItem>
  )
}

function AssistantBubble({ content }: { content: string }) {
  return (
    <div className="rounded-2xl rounded-bl-md border bg-muted/50 px-4 py-3 text-sm leading-6">
      <MarkdownContent content={content} />
    </div>
  )
}

function TypingDots() {
  const { t } = useI18n()
  return (
    <span
      className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md border bg-muted/50 px-4 py-3.5"
      role="status"
      aria-label={t("ai.message.thinking")}
    >
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/70 motion-reduce:animate-none"
        />
      ))}
    </span>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-2 [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:text-xs [&_table]:w-full [&_td]:border [&_th]:border [&_th]:px-2 [&_td]:px-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={t("ai.message.copy")}
      title={t("ai.message.copy")}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  )
}

function Bubble({
  isUser,
  children,
}: {
  isUser: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-2xl px-4 py-3 leading-6 whitespace-pre-wrap",
        isUser
          ? "rounded-br-md bg-primary text-primary-foreground"
          : "rounded-bl-md border bg-muted/50"
      )}
    >
      {children}
    </div>
  )
}

function ToolResultBody({
  result,
  messageId,
}: {
  result?: ToolResultPayload
  messageId: string
}) {
  const { t } = useI18n()

  if (!result) {
    return (
      <Bubble isUser={false}>
        <span className="text-muted-foreground">{t("ai.tool.unparsed")}</span>
      </Bubble>
    )
  }

  const entry = resolveToolRenderer(result)
  if (entry) {
    const Renderer = entry.component
    return <Renderer result={result} messageId={messageId} />
  }

  return (
    <Collapsible className="mt-1 w-full">
      <CollapsibleTrigger className="group flex items-center gap-1 rounded-md border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
        <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
        {t("ai.tool.details")}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-xs leading-5 text-muted-foreground">
          {JSON.stringify(result, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ApprovalSection({ result }: { result: ToolResultPayload }) {
  const proposal = extractApprovalProposal(result)
  if (!proposal || proposal.status !== "PENDING") return null
  return <ApprovalCard proposal={proposal} />
}
