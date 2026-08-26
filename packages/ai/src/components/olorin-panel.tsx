import { useMemo, useState, type FormEvent } from "react"
import { useI18n } from "@workspace/i18n"
import { cn } from "@workspace/ui/lib/utils"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
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
import { ChevronDown, Send, Sparkles } from "lucide-react"
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
}

if (!areDefaultRenderersRegistered()) {
  registerCustomerSummaryRenderer()
  registerKnowledgeCitationRenderer()
  markDefaultRenderersRegistered()
}

const suggestionKeys = ["customer", "knowledge"] as const

export function OlorinPanel({ className, fixtureKey }: OlorinPanelProps) {
  const { t } = useI18n()
  const { messages, isReady, isRunning, send } = useOlorin()
  const [input, setInput] = useState("")
  const [error, setError] = useState("")

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
      <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport aria-label={t("ai.transcript.label")}>
            <MessageScrollerContent className="p-4" aria-busy={isRunning}>
              {displayMessages.length === 0 ? (
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
        <div className="flex items-end gap-2">
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
            className="max-h-40 min-h-11 flex-1 resize-none"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            aria-label={t("ai.composer.send")}
            disabled={
              !input.trim() || isRunning || !isReady || Boolean(fixtureMessages)
            }
            className="size-11 shrink-0"
          >
            {isRunning ? <Spinner /> : <Send />}
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-xs text-muted-foreground">
          {statusLabel}
          {" · "}
          {t("ai.composer.hint")}
        </p>
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
      <Message align={isUser ? "end" : "start"} className="py-2">
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
          ) : (
            <Bubble isUser={isUser}>
              {content ||
                (!isUser ? t("ai.message.thinking") : "")}
            </Bubble>
          )}
          {toolResult && message.role === "tool" && (
            <ApprovalSection result={toolResult} />
          )}
          {!isUser && message.role !== "tool" && <MessageFooter />}
        </MessageContent>
      </Message>
    </MessageScrollerItem>
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
