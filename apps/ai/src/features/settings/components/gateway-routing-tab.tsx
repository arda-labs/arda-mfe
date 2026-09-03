import { useState } from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  ArrowRight,
  CheckCircle2,
  GitFork,
  Network,
} from "lucide-react"

export function GatewayRoutingTab() {
  const [fastModel, setFastModel] = useState("gemini-2.5-flash")
  const [codeModel, setCodeModel] = useState("claude-3.5-sonnet")
  const [sensitiveModel, setSensitiveModel] = useState("qwen2.5:7b-instruct-q4_K_M")
  const [primaryProvider, setPrimaryProvider] = useState("gemini")
  const [secondaryProvider, setSecondaryProvider] = useState("openai")
  const [failoverProvider, setFailoverProvider] = useState("ollama")

  const handleSave = () => {
    notify.success("Đã cập nhật quy tắc định tuyến Model Gateway!")
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="shadow-xs lg:col-span-7">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <GitFork className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Định tuyến Mô hình theo Tác vụ (Task-based Routing)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Tự động điều hướng các yêu cầu người dùng đến model tối ưu nhất về chi phí và năng lực
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground">Hội thoại thông thường (General Chat)</span>
                  <p className="text-[11px] text-muted-foreground">Ưu tiên tốc độ phản hồi cực nhanh (&lt;500ms) và tiết kiệm chi phí</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">Triage / Fast</Badge>
              </div>
              <div className="mt-2">
                <Select value={fastModel} onValueChange={setFastModel}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.5-flash">Google Gemini 2.5 Flash ($0.075 / 1M tok)</SelectItem>
                    <SelectItem value="gpt-4o-mini">OpenAI GPT-4o mini ($0.15 / 1M tok)</SelectItem>
                    <SelectItem value="qwen2.5:7b-instruct-q4_K_M">Qwen 2.5 7B (On-Prem $0.00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground">Lập trình & Viết câu lệnh SQL (Code Generation)</span>
                  <p className="text-[11px] text-muted-foreground">Cần độ chính xác cú pháp cao và tư duy logic đa bước</p>
                </div>
                <Badge variant="outline" className="text-[10px]">Reasoning</Badge>
              </div>
              <div className="mt-2">
                <Select value={codeModel} onValueChange={setCodeModel}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3.5-sonnet">Claude 3.5 Sonnet (Chuyên sâu về Code)</SelectItem>
                    <SelectItem value="deepseek-r1">DeepSeek R1 (Reasoning Chain-of-Thought)</SelectItem>
                    <SelectItem value="gpt-4o">OpenAI GPT-4o (Đa nhiệm cao cấp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground">Dữ liệu nhạy cảm & Tài chính (Privacy Isolation)</span>
                  <p className="text-[11px] text-muted-foreground">Bắt buộc xử lý cục bộ trên cụm máy chủ on-premise, không gửi ra ngoài</p>
                </div>
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600">On-Prem Only</Badge>
              </div>
              <div className="mt-2">
                <Select value={sensitiveModel} onValueChange={setSensitiveModel}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qwen2.5:7b-instruct-q4_K_M">Qwen 2.5 7B Local (LAN 192.168.10.201)</SelectItem>
                    <SelectItem value="llama3.1:8b">Llama 3.1 8B Instruct Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs lg:col-span-5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Chuỗi Dự phòng (High Availability Fallback)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Tự động chuyển tiếp nếu nhà cung cấp chính gặp lỗi 429 Quota Exceeded hoặc Timeout
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    1
                  </div>
                  <span className="font-medium">Primary:</span>
                </div>
                <Select value={primaryProvider} onValueChange={setPrimaryProvider}>
                  <SelectTrigger className="h-6 w-28 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[10px] font-bold">
                    2
                  </div>
                  <span className="font-medium">Secondary (429):</span>
                </div>
                <Select value={secondaryProvider} onValueChange={setSecondaryProvider}>
                  <SelectTrigger className="h-6 w-28 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="gemini">Gemini</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between rounded-lg border bg-muted/40 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive/10 text-[10px] font-bold text-destructive">
                    3
                  </div>
                  <span className="font-medium">Failover (On-Prem):</span>
                </div>
                <Select value={failoverProvider} onValueChange={setFailoverProvider}>
                  <SelectTrigger className="h-6 w-28 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Ollama K3s</SelectItem>
                    <SelectItem value="vllm">vLLM Local</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border bg-emerald-500/10 border-emerald-500/30 p-3">
              <div className="flex items-center gap-2 font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>Zero-Downtime Guarantee</span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-800 leading-relaxed">
                Khi Cloud API bị gián đoạn, hệ thống tự động retry 3 lần với exponential backoff rồi failover sang mô hình nội bộ trên máy chủ K3s.
              </p>
            </div>

            <Button size="sm" className="w-full" onClick={handleSave}>
              Cập nhật Chuỗi Dự phòng
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
