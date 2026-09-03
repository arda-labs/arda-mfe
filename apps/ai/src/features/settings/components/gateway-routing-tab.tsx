import { useState } from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  Activity,
  FileCode,
  GitBranch,
  Lock,
  MessageSquare,
  Network,
  Server,
  Shield,
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
      <Card className="shadow-xs border-border min-w-0">
        <CardHeader className="pb-3 border-b border-border/70">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-foreground shrink-0" />
              <div>
                <CardTitle className="text-sm font-semibold">
                  Mạch Dự phòng Đa Tầng (High-Availability Fallback Circuit)
                </CardTitle>
                <CardDescription className="text-xs">
                  Cơ chế dự phòng cấp doanh nghiệp: Tự động chuyển tiếp khi Primary chạm ngưỡng quota hoặc lỗi mạng
                </CardDescription>
              </div>
            </div>
            <Status variant="success" className="text-[11px]">
              <StatusIndicator />
              <StatusLabel>SLA Cam kết: 99.99% Availability</StatusLabel>
            </Status>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-xs">
          {/* Telemetry info bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-foreground" />
              Chính sách tái thử nghiệm (Retry Policy): <strong className="text-foreground">3 lần (Exponential Backoff 100ms - 2s)</strong>
            </span>
            <span className="font-mono text-[10.5px]">Giới hạn thời gian (Max Timeout): 25.0s</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Step 1: Primary Cloud Gateway */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs transition-all duration-150 hover:border-border/80">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
                      1
                    </div>
                    <span className="font-bold text-foreground text-xs">Cổng Chính (Primary Gateway)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">Tier 1</Badge>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                  Mô hình mặc định tiếp nhận 100% lưu lượng truy vấn trong điều kiện bình thường.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <Label className="text-[11px] text-muted-foreground">Nhà cung cấp chính</Label>
                <Select value={primaryProvider} onValueChange={setPrimaryProvider}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini 2.5 Flash (Cloud Fast)</SelectItem>
                    <SelectItem value="openai">OpenAI GPT-4o Official</SelectItem>
                    <SelectItem value="deepseek">DeepSeek AI Official</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between rounded border border-border/70 bg-background px-2.5 py-1.5 text-[10.5px]">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <Status variant="success" className="h-4 px-1.5 text-[9.5px]">
                    <StatusIndicator />
                    <StatusLabel>Online (118ms)</StatusLabel>
                  </Status>
                </div>
              </div>
            </div>

            {/* Step 2: Secondary Cloud Gateway */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs transition-all duration-150 hover:border-border/80">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold text-foreground">
                      2
                    </div>
                    <span className="font-bold text-foreground text-xs">Cổng Dự phòng 1 (Secondary)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">Trigger: 429</Badge>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                  Tự kích hoạt chuyển tiếp khi cổng chính quá tải, hết quota RPM/TPM hoặc lỗi 5xx.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <Label className="text-[11px] text-muted-foreground">Nhà cung cấp dự phòng 1</Label>
                <Select value={secondaryProvider} onValueChange={setSecondaryProvider}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI GPT-4o mini (Secondary)</SelectItem>
                    <SelectItem value="gemini">Google Gemini (Fallback)</SelectItem>
                    <SelectItem value="openrouter">OpenRouter Multi-Gateway</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between rounded border border-border/70 bg-background px-2.5 py-1.5 text-[10.5px]">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <Status variant="warning" className="h-4 px-1.5 text-[9.5px]">
                    <StatusIndicator />
                    <StatusLabel>Hot-Standby</StatusLabel>
                  </Status>
                </div>
              </div>
            </div>

            {/* Step 3: Cluster Failover (On-Prem K8s) */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs transition-all duration-150 hover:border-border/80">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold text-foreground">
                      3
                    </div>
                    <span className="font-bold text-foreground text-xs">Cụm Khẩn cấp (Air-gapped Failover)</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">On-Prem K3s</Badge>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">
                  Cơ chế dự phòng sống còn: Chạy trên máy chủ GPU LAN nội bộ khi mất kết nối Internet.
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-border pt-3">
                <Label className="text-[11px] text-muted-foreground">Cụm máy chủ nội bộ</Label>
                <Select value={failoverProvider} onValueChange={setFailoverProvider}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ollama">Ollama K3s LAN (192.168.10.201)</SelectItem>
                    <SelectItem value="vllm">vLLM GPU Local Cluster</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between rounded border border-border/70 bg-background px-2.5 py-1.5 text-[10.5px]">
                  <span className="text-muted-foreground">Bảo vệ:</span>
                  <span className="font-mono font-medium text-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    Zero Internet Dependency
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Task-based Model Router - Full Width Grid */}
      <Card className="shadow-xs border-border min-w-0">
        <CardHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-foreground" />
            <div>
              <CardTitle className="text-sm font-semibold">
                Định tuyến Mô hình theo Tác vụ (Task-based Model Routing)
              </CardTitle>
              <CardDescription className="text-xs">
                Phân bổ tài nguyên AI theo chính sách bảo mật và yêu cầu năng lực xử lý nghiệp vụ
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 text-xs">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Task 1 */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-muted/40 text-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-bold text-foreground text-xs">Hội thoại & Vận hành</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">Triage</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Xử lý hỏi-đáp quy trình, tóm tắt văn bản ngắn. Ưu tiên độ trễ thấp (&lt;500ms) và tối ưu ngân sách.
                </p>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <Select value={fastModel} onValueChange={setFastModel}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.5-flash">Google Gemini 2.5 Flash ($0.075 / 1M tok)</SelectItem>
                    <SelectItem value="gpt-4o-mini">OpenAI GPT-4o mini ($0.15 / 1M tok)</SelectItem>
                    <SelectItem value="qwen2.5:7b-instruct-q4_K_M">Qwen 2.5 7B (On-Prem $0.00)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                  <span>Ước tính chi phí:</span>
                  <span className="font-mono text-foreground font-semibold">&lt; $0.0001 / request</span>
                </div>
              </div>
            </div>

            {/* Task 2 */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-muted/40 text-foreground">
                      <FileCode className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-bold text-foreground text-xs">Lập trình & Viết SQL</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">Reasoning</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Sinh mã nguồn, tạo câu lệnh truy vấn CSDL phức tạp và phân tích logic đa bước (Chain-of-Thought).
                </p>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <Select value={codeModel} onValueChange={setCodeModel}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3.5-sonnet">Claude 3.5 Sonnet (Chuyên sâu Code)</SelectItem>
                    <SelectItem value="deepseek-r1">DeepSeek R1 (Reasoning CoT)</SelectItem>
                    <SelectItem value="gpt-4o">OpenAI GPT-4o (Đa nhiệm cao cấp)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                  <span>Độ chính xác logic:</span>
                  <span className="font-mono text-foreground font-semibold">92.4% Benchmark</span>
                </div>
              </div>
            </div>

            {/* Task 3 */}
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded border border-border bg-muted/40 text-foreground">
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                    <span className="font-bold text-foreground text-xs">Dữ liệu Tài chính Mật</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">On-Prem Only</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Bảng lương, hợp đồng và báo cáo tài chính nội bộ. Bắt buộc xử lý cục bộ, không gửi ra ngoài.
                </p>
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <Select value={sensitiveModel} onValueChange={setSensitiveModel}>
                  <SelectTrigger className="h-8 text-xs font-mono">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qwen2.5:7b-instruct-q4_K_M">Qwen 2.5 7B Local (LAN 192.168.10.201)</SelectItem>
                    <SelectItem value="llama3.1:8b">Llama 3.1 8B Instruct Local K3s</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between text-[10.5px] text-muted-foreground">
                  <span>Hạ tầng thực thi:</span>
                  <span className="font-mono text-foreground font-semibold flex items-center gap-1">
                    <Server className="h-3 w-3 text-muted-foreground" /> Máy chủ LAN K3s
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" className="text-xs" onClick={handleSave}>
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
