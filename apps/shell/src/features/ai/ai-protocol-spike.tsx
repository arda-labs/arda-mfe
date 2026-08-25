import { useState } from "react"
import { Button } from "@workspace/ui/components/button"

type AgentEvent = {
  type: string
  delta?: string
  result?: Record<string, unknown>
  error?: string
}

export function AiAssistantPage() {
  const [prompt, setPrompt] = useState("Tra cứu thông tin khách hàng")
  const [customerId, setCustomerId] = useState("")
  const [knowledgeQuery, setKnowledgeQuery] = useState("")
  const [output, setOutput] = useState("")
  const [toolResult, setToolResult] = useState<Record<string, unknown> | null>(null)
  const [status, setStatus] = useState("Sẵn sàng")
  const [error, setError] = useState("")

  async function runAssistant() {
    const threadId = crypto.randomUUID()
    const runId = crypto.randomUUID()
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

    setOutput("")
    setToolResult(null)
    setError("")
    setStatus("Đang xử lý...")

    try {
      const response = await fetch("/api/ai/agent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          runId,
          messages: [{ role: "user", content: prompt }],
          ...(tool ? { tool } : {}),
        }),
      })

      if (!response.ok) throw new Error(await response.text())
      if (!response.body) throw new Error("Server không trả về stream")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        buffer += decoder.decode(chunk.value, { stream: true })

        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() ?? ""
        for (const block of blocks) {
          const dataLine = block
            .split("\n")
            .find((line) => line.startsWith("data: "))
          if (!dataLine) continue
          const event = JSON.parse(dataLine.slice("data: ".length)) as AgentEvent
          if (event.type === "TEXT_MESSAGE_CONTENT") {
            setOutput((current) => current + (event.delta ?? ""))
          }
          if (event.type === "TOOL_CALL_END" && event.result) {
            setToolResult(event.result)
          }
          if (event.type === "RUN_FINISHED") {
            setStatus(event.error ? "Không hoàn tất" : "Hoàn tất")
          }
        }
      }
    } catch (caught) {
      setStatus("Không thể kết nối")
      setError(caught instanceof Error ? caught.message : "Không thể kết nối")
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-4 sm:p-6">
      <div className="mx-auto w-full max-w-4xl space-y-2">
        <p className="text-sm font-medium text-primary">Arda AI</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Trợ lý trong workspace
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Tra cứu có kiểm soát trong tenant hiện tại. Phase này chỉ đọc dữ liệu
          CRM đã được cấp quyền và không thực hiện thay đổi.
        </p>
      </div>

      <div className="mx-auto grid w-full max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
          <label className="block space-y-2 text-sm font-medium" htmlFor="ai-prompt">
            Yêu cầu
            <textarea
              id="ai-prompt"
              className="min-h-28 w-full rounded-md border bg-background p-3 text-base font-normal leading-6 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
          </label>
          <label className="block space-y-2 text-sm font-medium" htmlFor="ai-customer-id">
            Mã định danh khách hàng
            <input
              id="ai-customer-id"
              className="h-11 w-full rounded-md border bg-background px-3 text-base font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              placeholder="Tùy chọn cho crm.customer.get"
              inputMode="text"
            />
            <span className="block text-xs leading-5 text-muted-foreground">
              Ưu tiên tra cứu CRM nếu trường này có giá trị.
            </span>
          </label>
          <label className="block space-y-2 text-sm font-medium" htmlFor="ai-knowledge-query">
            Tìm trong knowledge đã duyệt
            <input
              id="ai-knowledge-query"
              className="h-11 w-full rounded-md border bg-background px-3 text-base font-normal outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              value={knowledgeQuery}
              onChange={(event) => setKnowledgeQuery(event.target.value)}
              placeholder="Tùy chọn cho knowledge.search"
              inputMode="search"
            />
            <span className="block text-xs leading-5 text-muted-foreground">
              Chỉ trả về nguồn PUBLISHED thuộc tenant hoặc nguồn global.
            </span>
          </label>
          <Button
            className="min-h-11"
            disabled={!prompt.trim() || status === "Đang xử lý..."}
            onClick={() => void runAssistant()}
          >
            {status === "Đang xử lý..." ? "Đang xử lý..." : "Gửi yêu cầu"}
          </Button>
          <p className="text-sm" aria-live="polite">
            Trạng thái: {status}
          </p>
          {output && (
            <div className="rounded-md bg-muted p-4 text-sm leading-6" aria-live="polite">
              {output}
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <aside className="h-fit space-y-3 rounded-xl border bg-muted/30 p-4 text-sm">
          <h2 className="font-semibold">Phạm vi hiện tại</h2>
          <ul className="space-y-2 leading-5 text-muted-foreground">
            <li>• Tenant và organization lấy từ phiên đăng nhập.</li>
            <li>• CRM chỉ trả summary đã redacted; knowledge trả kèm citations.</li>
            <li>• Không có mutation, email, MFA hay workflow action.</li>
          </ul>
          {toolResult && (
            <details className="border-t pt-3">
              <summary className="cursor-pointer font-medium">Chi tiết tool result</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs leading-5">
                {JSON.stringify(toolResult, null, 2)}
              </pre>
            </details>
          )}
        </aside>
      </div>
    </section>
  )
}

export const AiProtocolSpikePage = AiAssistantPage
