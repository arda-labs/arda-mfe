import { useMemo, useState } from "react"
import {
  CopilotKitProvider,
  UseAgentUpdate,
  useAgent,
} from "@copilotkit/react-core/v2"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
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

type ToolResult = Record<string, unknown>

type RenderMessage = {
  id: string
  role: string
  content?: unknown
}

function textValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback
}

function messageText(content: unknown) {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("")
}

function parsedToolResult(message: RenderMessage): ToolResult | undefined {
  if (message.role !== "tool") return undefined
  const content = messageText(message.content)
  if (!content) return undefined
  try {
    const result = JSON.parse(content) as unknown
    return typeof result === "object" && result !== null
      ? (result as ToolResult)
      : undefined
  } catch {
    return undefined
  }
}

function citationsFrom(result: ToolResult | undefined) {
  if (!Array.isArray(result?.citations)) return []

  return result.citations.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null
  )
}

function AssistantToolResult({ result }: { result: ToolResult }) {
  const citations = citationsFrom(result)

  return (
    <div className="mt-3 space-y-2 border-t pt-3 text-xs">
      {citations.length > 0 && (
        <div className="space-y-1.5">
          <p className="font-medium text-foreground">Nguồn tham khảo</p>
          <ul className="space-y-1.5 text-muted-foreground">
            {citations.map((citation, index) => (
              <li key={`${textValue(citation.sourceId, "source")}-${index}`}>
                <span className="font-medium text-foreground">
                  {textValue(citation.title, "Knowledge source")}
                </span>
                <span>
                  {" · "}
                  {textValue(citation.heading, textValue(citation.sourceKey, "Arda knowledge"))}
                  {" · v"}
                  {textValue(citation.version, "current")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <details>
        <summary className="cursor-pointer font-medium text-muted-foreground">
          Chi tiết tool result
        </summary>
        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap leading-5 text-muted-foreground">
          {JSON.stringify(result, null, 2)}
        </pre>
      </details>
    </div>
  )
}

function AiAssistantSurface() {
  const [prompt, setPrompt] = useState("Tra cứu thông tin khách hàng")
  const [customerId, setCustomerId] = useState("")
  const [knowledgeQuery, setKnowledgeQuery] = useState("")
  const [error, setError] = useState("")
  const { agent, isReady } = useAgent({
    agentId: "arda-assistant",
    updates: [
      UseAgentUpdate.OnMessagesChanged,
      UseAgentUpdate.OnRunStatusChanged,
    ],
  })

  const messages = agent.messages as unknown as RenderMessage[]
  const isRunning = agent.isRunning
  const status = !isReady
    ? "Đang kết nối..."
    : isRunning
      ? "Đang xử lý..."
      : error
        ? "Không thể kết nối"
        : messages.length > 0
          ? "Hoàn tất"
          : "Sẵn sàng"

  const displayMessages = useMemo(
    () => messages.filter((message) => ["user", "assistant", "tool"].includes(message.role)),
    [messages]
  )

  async function runAssistant() {
    const content = prompt.trim()
    if (!content || isRunning || !isReady) return

    const selectedCustomerId = customerId.trim()
    const selectedKnowledgeQuery = knowledgeQuery.trim()
    const tool = selectedCustomerId
      ? {
          name: "crm.customer.get",
          version: 1,
          arguments: { customerId: selectedCustomerId },
        }
      : selectedKnowledgeQuery
        ? {
            name: "knowledge.search",
            version: 1,
            arguments: { query: selectedKnowledgeQuery, limit: 5 },
          }
        : undefined

    setError("")
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content })

    try {
      await agent.runAgent({
        runId: crypto.randomUUID(),
        forwardedProps: tool ? { ardaTool: tool } : {},
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể kết nối")
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-4 sm:p-6">
      <div className="mx-auto w-full max-w-6xl space-y-2">
        <p className="text-sm font-medium text-primary">Arda AI</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Trợ lý trong workspace</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Chat có kiểm soát trong tenant hiện tại. Phase này chỉ đọc dữ liệu CRM đã được cấp quyền và không thực hiện thay đổi.
        </p>
      </div>

      <div className="mx-auto grid min-h-0 w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-h-[38rem] min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <MessageScrollerProvider autoScroll defaultScrollPosition="last-anchor">
            <MessageScroller className="flex-1">
              <MessageScrollerViewport aria-label="Lịch sử hội thoại Arda AI">
                <MessageScrollerContent className="p-4 sm:p-6" aria-busy={isRunning}>
                  {displayMessages.length === 0 ? (
                    <div className="flex min-h-64 items-center justify-center text-center text-sm text-muted-foreground">
                      Gửi yêu cầu đầu tiên để bắt đầu cuộc hội thoại.
                    </div>
                  ) : (
                    displayMessages.map((message) => {
                      const isUser = message.role === "user"
                      const toolResult = parsedToolResult(message)
                      const content = messageText(message.content)
                      return (
                        <MessageScrollerItem key={message.id} messageId={message.id} scrollAnchor={isUser}>
                          <Message align={isUser ? "end" : "start"}>
                            <MessageAvatar>
                              <Avatar className="size-8">
                                <AvatarFallback>{isUser ? "Bạn" : "AI"}</AvatarFallback>
                              </Avatar>
                            </MessageAvatar>
                            <MessageContent className="max-w-[85%]">
                              <MessageHeader>
                                {isUser ? "Bạn" : message.role === "tool" ? "Arda AI · tool" : "Arda AI"}
                              </MessageHeader>
                              <div
                                className={
                                  isUser
                                    ? "rounded-2xl rounded-br-md bg-primary px-4 py-3 whitespace-pre-wrap text-primary-foreground"
                                    : "rounded-2xl rounded-bl-md border bg-muted/50 px-4 py-3 whitespace-pre-wrap leading-6"
                                }
                              >
                                {content || (message.role === "assistant" ? "Đang chuẩn bị câu trả lời..." : "")}
                                {toolResult && <AssistantToolResult result={toolResult} />}
                              </div>
                              <MessageFooter />
                            </MessageContent>
                          </Message>
                        </MessageScrollerItem>
                      )
                    })
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          </MessageScrollerProvider>

          <div className="border-t bg-background p-4 sm:p-6">
            <label className="sr-only" htmlFor="ai-prompt">Yêu cầu cho Arda AI</label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <textarea
                id="ai-prompt"
                className="min-h-20 flex-1 rounded-md border bg-background p-3 text-base leading-6 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault()
                    void runAssistant()
                  }
                }}
                placeholder="Bạn muốn Arda AI tra cứu gì?"
              />
              <Button className="min-h-11" disabled={!prompt.trim() || isRunning || !isReady} onClick={() => void runAssistant()}>
                {isRunning ? "Đang xử lý..." : "Gửi yêu cầu"}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Ctrl/Cmd + Enter để gửi · Trạng thái: {status}</p>
            {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-xl border bg-muted/30 p-4 text-sm">
          <div>
            <h2 className="font-semibold">Nguồn tra cứu</h2>
            <p className="mt-1 leading-5 text-muted-foreground">Chọn một tool đọc dữ liệu cho lượt chat tiếp theo.</p>
          </div>
          <label className="block space-y-2 font-medium" htmlFor="ai-customer-id">
            Mã khách hàng
            <input
              id="ai-customer-id"
              className="h-11 w-full rounded-md border bg-background px-3 font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              placeholder="Tùy chọn CRM"
              inputMode="text"
            />
          </label>
          <label className="block space-y-2 font-medium" htmlFor="ai-knowledge-query">
            Knowledge đã duyệt
            <input
              id="ai-knowledge-query"
              className="h-11 w-full rounded-md border bg-background px-3 font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              value={knowledgeQuery}
              onChange={(event) => setKnowledgeQuery(event.target.value)}
              placeholder="Tùy chọn tìm kiếm"
              inputMode="search"
            />
          </label>
          <ul className="space-y-2 border-t pt-3 leading-5 text-muted-foreground">
            <li>• Tenant và organization lấy từ phiên đăng nhập.</li>
            <li>• CRM trả summary đã redacted; knowledge trả citations.</li>
            <li>• Không có mutation, email, MFA hay workflow action.</li>
          </ul>
        </aside>
      </div>
    </section>
  )
}

export function AiAssistantPage() {
  return (
    <CopilotKitProvider runtimeUrl="/api/copilotkit" useSingleEndpoint>
      <AiAssistantSurface />
    </CopilotKitProvider>
  )
}

export const AiProtocolSpikePage = AiAssistantPage
