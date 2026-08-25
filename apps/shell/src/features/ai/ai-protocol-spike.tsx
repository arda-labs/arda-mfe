import { useState } from "react"
import { Button } from "@workspace/ui/components/button"

type AgentEvent = {
  type: string
  delta?: string
}

export function AiProtocolSpikePage() {
  const [prompt, setPrompt] = useState("Kiểm tra kết nối AG-UI")
  const [output, setOutput] = useState("")
  const [status, setStatus] = useState("Chưa chạy")
  const [error, setError] = useState("")

  async function runSpike() {
    const threadId = crypto.randomUUID()
    const runId = crypto.randomUUID()

    setOutput("")
    setError("")
    setStatus("Đang kết nối...")

    try {
      const response = await fetch("/api/ai/agent", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          runId,
          messages: [{ role: "user", content: prompt }],
        }),
      })

      if (!response.ok) throw new Error(await response.text())
      if (!response.body) throw new Error("Server không trả về stream")

      setStatus("Đang nhận stream...")
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
          if (event.type === "RUN_FINISHED") setStatus("Hoàn tất")
        }
      }
    } catch (caught) {
      setStatus("Lỗi")
      setError(caught instanceof Error ? caught.message : "Không thể kết nối")
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
      <div>
        <h1 className="text-xl font-semibold">AI protocol spike</h1>
        <p className="text-sm text-muted-foreground">
          Local-only AG-UI/SSE check. Không gọi model hoặc tool thật.
        </p>
      </div>
      <div className="max-w-2xl space-y-3 rounded-lg border bg-card p-4">
        <label
          className="block space-y-1 text-sm font-medium"
          htmlFor="ai-spike-prompt"
        >
          Nội dung thử nghiệm
          <textarea
            id="ai-spike-prompt"
            className="min-h-24 w-full rounded-md border bg-background p-2 text-sm font-normal"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
        <Button disabled={!prompt.trim()} onClick={() => void runSpike()}>
          Chạy protocol spike
        </Button>
        <p className="text-sm">Trạng thái: {status}</p>
        {output && (
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">
            {output}
          </pre>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </section>
  )
}
