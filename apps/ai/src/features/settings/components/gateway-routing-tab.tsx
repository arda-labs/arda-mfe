import { useState } from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  CheckCircle2,
  GitFork,
  Network,
  ShieldCheck,
} from "lucide-react"

export function GatewayRoutingTab() {
  const [fastModel, setFastModel] = useState("gemini-2.5-flash")
  const [codeModel, setCodeModel] = useState("claude-3.5-sonnet")
  const [sensitiveModel, setSensitiveModel] = useState("qwen2.5:7b-instruct-q4_K_M")

  const [primaryProvider, setPrimaryProvider] = useState("gemini")
  const [secondaryProvider, setSecondaryProvider] = useState("openai")
  const [failoverProvider, setFailoverProvider] = useState("ollama")

  const handleSave = () => {
    notify.success("Đã cập nhật quy tắc định tuyến Model Gateway & Chuỗi Dự phòng!")
  }

  return (
    <div className="space-y-6">
      {/* 1. High Availability Fallback Pipeline - Full Width */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  Chuỗi Dự phòng Chống Gián đoạn (High Availability Fallback Pipeline)
                </CardTitle>
                <CardDescription className="text-xs">
                  Tự động chuyển tiếp nếu nhà cung cấp chính gặp lỗi 429 Quota Exceeded, timeout hoặc mất kết nối internet
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 gap-1 text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Zero-Downtime SLA
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Step 1: Primary */}
            <div className="flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/50 shadow-2xs">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      1
                    </div>
                    <span className="font-semibold text-foreground text-xs">Primary Provider</span>
                  </div>
                  <Badge variant="default" className="text-[10px]">Ưu tiên 1</Badge>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Mô hình chính xử lý toàn bộ truy vấn trong điều kiện hạ tầng hoạt động bình thường.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t pt-3">
                <Label className="text-[11px] text-muted-foreground">Nhà cung cấp chính</Label>
                <Select value={primaryProvider} onValueChange={setPrimaryProvider}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini 2.5 (Cloud Fast)</SelectItem>
                    <SelectItem value="openai">OpenAI GPT-4o (Official)</SelectItem>
                    <SelectItem value="deepseek">DeepSeek AI Official</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                  <span>Trạng thái:</span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online (120ms)
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2: Secondary */}
            <div className="flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/50 shadow-2xs">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                      2
                    </div>
                    <span className="font-semibold text-foreground text-xs">Secondary Fallback</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Khi gặp 429</Badge>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Tự động chuyển tiếp khi Primary chạm ngưỡng TPM/RPM quota hoặc trả về lỗi 5xx.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t pt-3">
                <Label className="text-[11px] text-muted-foreground">Nhà cung cấp dự phòng 1</Label>
                <Select value={secondaryProvider} onValueChange={setSecondaryProvider}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI GPT-4o mini (Secondary)</SelectItem>
                    <SelectItem value="gemini">Google Gemini (Fallback)</SelectItem>
                    <SelectItem value="openrouter">OpenRouter Multi-Gateway</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                  <span>Trạng thái:</span>
                  <span className="font-medium text-muted-foreground flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Standby (Sẵn sàng)
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Cluster Failover */}
            <div className="flex flex-col justify-between rounded-xl border bg-card p-4 transition-all hover:border-primary/50 shadow-2xs">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-foreground">
                      3
                    </div>
                    <span className="font-semibold text-foreground text-xs">Cluster Failover</span>
                  </div>
                  <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600">On-Prem K8s</Badge>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Chế độ khẩn cấp khi mất internet: Inference trực tiếp trên máy chủ GPU nội bộ.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t pt-3">
                <Label className="text-[11px] text-muted-foreground">Cụm máy chủ nội bộ</Label>
                <Select value={failoverProvider} onValueChange={setFailoverProvider}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Ollama K3s LAN (192.168.10.201)</SelectItem>
                    <SelectItem value="vllm">vLLM GPU Cluster (Local)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                  <span>Trạng thái:</span>
                  <span className="font-medium text-primary flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    Air-gapped Local Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Task-based Model Router - Full Width Grid */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GitFork className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-semibold">
                Định tuyến Mô hình theo Tác vụ (Task-based Routing)
              </CardTitle>
              <CardDescription className="text-xs">
                Phân bổ tài nguyên AI thông minh theo tính chất bài toán để tối ưu chất lượng và kiểm soát chi phí
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Task 1 */}
            <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">Hội thoại thông thường</span>
                <Badge variant="secondary" className="text-[10px]">Fast / Triage</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Các câu hỏi hỏi-đáp quy trình, tóm tắt văn bản ngắn. Ưu tiên độ trễ cực thấp và chi phí rẻ.
              </p>
              <div className="pt-1">
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

            {/* Task 2 */}
            <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">Lập trình & Viết SQL</span>
                <Badge variant="outline" className="text-[10px]">Reasoning</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Tác vụ sinh code, truy vấn cơ sở dữ liệu và xử lý logic đa bước. Cần độ chính xác tuyệt đối.
              </p>
              <div className="pt-1">
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

            {/* Task 3 */}
            <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-xs">Dữ liệu nhạy cảm & Tài chính</span>
                <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600">On-Prem Only</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Hợp đồng kinh doanh, bảng lương và báo cáo tài chính mật. Bắt buộc xử lý nội bộ 100%.
              </p>
              <div className="pt-1">
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
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleSave}>
              Lưu Quy tắc Định tuyến Gateway
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={`block font-medium ${className || ""}`}>{children}</label>
}
