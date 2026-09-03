import { useState } from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  Activity,
  GitFork,
  Lock,
  Network,
  Radio,
  Server,
  ShieldCheck,
  Terminal,
  Zap,
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
    <div className="space-y-6 min-w-0">
      {/* 1. High Availability Fallback Pipeline - Full Width */}
      <Card className="shadow-xs border-border/80 min-w-0">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  Mạch Dự phòng Đa Tầng (High Availability Fallback Pipeline)
                </CardTitle>
                <CardDescription className="text-xs">
                  Cơ chế Zero-Downtime: Tự động chuyển tiếp khi Primary chạm ngưỡng TPM/RPM hoặc rớt mạng Internet
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 gap-1 text-[10px] font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                99.99% Availability SLA
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-xs">
          {/* Telemetry info bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Giao thức dự phòng: <strong className="text-foreground">3x Retries với Exponential Backoff (100ms - 2s)</strong>
            </span>
            <span className="font-mono text-[10px]">Max Execution Timeout: 25.0s</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Step 1: Primary Cloud Gateway */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-primary/50 bg-gradient-to-b from-primary/5 via-card to-card p-4 shadow-sm transition-all duration-300 hover:border-primary">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-2xs">
                      1
                    </div>
                    <span className="font-bold text-foreground text-xs">Primary Cloud Gateway</span>
                  </div>
                  <Badge variant="default" className="text-[10px] bg-primary">Mặc định</Badge>
                </div>
                <p className="mt-2.5 text-[11px] text-muted-foreground leading-relaxed">
                  Mô hình chính tiếp nhận 100% traffic tác vụ hàng ngày của toàn bộ tổ chức.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                <Label className="text-[11px] text-muted-foreground">Nhà cung cấp chính</Label>
                <Select value={primaryProvider} onValueChange={setPrimaryProvider}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini 2.5 Flash (Cloud Ultra-Fast)</SelectItem>
                    <SelectItem value="openai">OpenAI GPT-4o Official</SelectItem>
                    <SelectItem value="deepseek">DeepSeek AI Official</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-1.5 text-[10px]">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <span className="font-medium text-emerald-600 flex items-center gap-1">
                    <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                    Online (Latency: 118ms)
                  </span>
                </div>
              </div>
            </div>

            {/* Step 2: Secondary Cloud Gateway */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-2xs transition-all duration-300 hover:border-border">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-foreground shadow-2xs">
                      2
                    </div>
                    <span className="font-bold text-foreground text-xs">Secondary Fallback</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">Trigger: HTTP 429</Badge>
                </div>
                <p className="mt-2.5 text-[11px] text-muted-foreground leading-relaxed">
                  Tự kích hoạt khi nhà cung cấp chính gặp sự cố quá tải, hết quota hoặc trả về HTTP 5xx.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                <Label className="text-[11px] text-muted-foreground">Nhà cung cấp dự phòng 1</Label>
                <Select value={secondaryProvider} onValueChange={setSecondaryProvider}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI GPT-4o mini (Secondary)</SelectItem>
                    <SelectItem value="gemini">Google Gemini (Fallback)</SelectItem>
                    <SelectItem value="openrouter">OpenRouter Multi-Gateway</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[10px]">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <span className="font-medium text-amber-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Hot-Standby (Sẵn sàng)
                  </span>
                </div>
              </div>
            </div>

            {/* Step 3: Cluster Failover (On-Prem K8s) */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-card to-card p-4 shadow-2xs transition-all duration-300 hover:border-amber-500/60">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-bold text-amber-600 shadow-2xs">
                      3
                    </div>
                    <span className="font-bold text-foreground text-xs">Cluster Air-gapped Failover</span>
                  </div>
                  <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-600 bg-amber-500/10">
                    On-Premises
                  </Badge>
                </div>
                <p className="mt-2.5 text-[11px] text-muted-foreground leading-relaxed">
                  Cơ chế sống còn: Inference trực tiếp trên máy chủ node K3s LAN khi mạng internet bị đứt.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                <Label className="text-[11px] text-muted-foreground">Cụm máy chủ nội bộ</Label>
                <Select value={failoverProvider} onValueChange={setFailoverProvider}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Ollama K3s LAN (192.168.10.201)</SelectItem>
                    <SelectItem value="vllm">vLLM GPU Local Cluster</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[10px]">
                  <span className="text-muted-foreground">Bảo vệ:</span>
                  <span className="font-medium text-amber-600 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-amber-600" />
                    Zero Internet Required
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Task-based Model Router - Full Width Grid */}
      <Card className="shadow-xs border-border/80 min-w-0">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GitFork className="h-4 w-4 text-primary" />
            <div>
              <CardTitle className="text-sm font-semibold">
                Định tuyến Mô hình theo Tác vụ (Task-based Model Routing)
              </CardTitle>
              <CardDescription className="text-xs">
                Tối ưu chi phí và năng lực tính toán bằng cách giao đúng việc cho đúng mô hình AI chuyên trách
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Task 1 */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-cyan-500/5 via-card to-card p-4 transition-all duration-300 hover:border-cyan-500/40 shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg border bg-background p-1.5 text-cyan-500 shadow-2xs">
                      <Zap className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-foreground text-xs">Hội thoại thông thường</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-cyan-500/10 text-cyan-600">Fast / Triage</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  Xử lý hỏi-đáp chính sách, tóm tắt nhanh email và văn bản ngắn. Ưu tiên độ trễ &lt;500ms và tiết kiệm ngân sách.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                <Select value={fastModel} onValueChange={setFastModel}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.5-flash">Google Gemini 2.5 Flash ($0.075 / 1M tok)</SelectItem>
                    <SelectItem value="gpt-4o-mini">OpenAI GPT-4o mini ($0.15 / 1M tok)</SelectItem>
                    <SelectItem value="qwen2.5:7b-instruct-q4_K_M">Qwen 2.5 7B (On-Prem $0.00)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Ước tính chi phí:</span>
                  <span className="font-mono text-emerald-600 font-semibold">&lt; $0.0001 / req</span>
                </div>
              </div>
            </div>

            {/* Task 2 */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-indigo-500/5 via-card to-card p-4 transition-all duration-300 hover:border-indigo-500/40 shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg border bg-background p-1.5 text-indigo-500 shadow-2xs">
                      <Terminal className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-foreground text-xs">Lập trình & Viết SQL</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-600 bg-indigo-500/10">Reasoning</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  Sinh mã nguồn phức tạp, viết câu lệnh truy vấn PostgreSQL và tư duy logic chuỗi (Chain-of-Thought).
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                <Select value={codeModel} onValueChange={setCodeModel}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3.5-sonnet">Claude 3.5 Sonnet (Chuyên sâu Code)</SelectItem>
                    <SelectItem value="deepseek-r1">DeepSeek R1 (Lý luận sâu CoT)</SelectItem>
                    <SelectItem value="gpt-4o">OpenAI GPT-4o (Đa nhiệm cao cấp)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Khả năng logic:</span>
                  <span className="font-mono text-indigo-600 font-semibold">92.4% HumanEval</span>
                </div>
              </div>
            </div>

            {/* Task 3 */}
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-amber-500/5 via-card to-card p-4 transition-all duration-300 hover:border-amber-500/40 shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg border bg-background p-1.5 text-amber-500 shadow-2xs">
                      <Lock className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-foreground text-xs">Dữ liệu nhạy cảm & Tài chính</span>
                  </div>
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-600">On-Prem Only</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                  Bảng lương, hợp đồng khách hàng và báo cáo tài chính mật. Tuyệt đối không gửi payload ra Internet.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-border/60 pt-3">
                <Select value={sensitiveModel} onValueChange={setSensitiveModel}>
                  <SelectTrigger className="h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qwen2.5:7b-instruct-q4_K_M">Qwen 2.5 7B Local (LAN 192.168.10.201)</SelectItem>
                    <SelectItem value="llama3.1:8b">Llama 3.1 8B Instruct Local K3s</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Định tuyến:</span>
                  <span className="font-mono text-amber-600 font-semibold flex items-center gap-1">
                    <Server className="h-3 w-3" /> Cụm K3s Node LAN
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" className="shadow-xs" onClick={handleSave}>
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
