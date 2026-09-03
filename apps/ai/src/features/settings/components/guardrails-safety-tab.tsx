import { useState } from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Switch } from "@workspace/ui/components/switch"
import {
  CheckCircle2,
  Lock,
  Radar,
  ScanEye,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"

export function GuardrailsSafetyTab() {
  const [promptInjectionDefense, setPromptInjectionDefense] = useState(true)
  const [piiMasking, setPiiMasking] = useState(true)
  const [hallucinationCheck, setHallucinationCheck] = useState(true)
  const [zeroRetention, setZeroRetention] = useState(true)
  const [injectionThreshold, setInjectionThreshold] = useState(0.85)

  const handleSave = () => {
    notify.success("Đã cập nhật cấu hình Rào chắn An toàn AI (Guardrails)!")
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Controls */}
        <Card className="shadow-xs lg:col-span-8 border-border/80 min-w-0">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Rào chắn An toàn Doanh nghiệp (Enterprise Guardrails)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Kiểm soát bảo mật 2 chiều (Input / Output) ngăn chặn rò rỉ dữ liệu mật và tấn công Jailbreak
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-[10px] gap-1 font-mono">
                <Radar className="h-3 w-3 animate-spin text-emerald-500" />
                Guardrails Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            {/* Guard 1: Prompt Injection */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/20 p-4 transition-all duration-200 hover:border-primary/40 shadow-2xs">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">Phát hiện & Chặn Prompt Injection / Jailbreak</span>
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary bg-primary/5">Input Guard</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Phân tích ngữ cảnh câu lệnh người dùng qua mô hình an toàn để vô hiệu hóa kỹ thuật vượt quyền (jailbreak), bypass role, và ép AI tiết lộ system prompt bí mật.
                  </p>
                </div>
                <Switch
                  checked={promptInjectionDefense}
                  onCheckedChange={setPromptInjectionDefense}
                  aria-label="Toggle Prompt Injection Defense"
                />
              </div>

              {promptInjectionDefense && (
                <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border/50 pt-3">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                    Ngưỡng nhạy cảm (Sensitivity Threshold):
                  </span>
                  <input
                    type="range"
                    min="0.6"
                    max="0.95"
                    step="0.05"
                    value={injectionThreshold}
                    onChange={(e) => setInjectionThreshold(parseFloat(e.target.value))}
                    className="w-32"
                  />
                  <span className="font-mono font-bold text-primary">{injectionThreshold}</span>
                  <span className="text-[10px] text-muted-foreground">(Khuyên dùng 0.85)</span>
                </div>
              )}
            </div>

            {/* Guard 2: PII / DLP */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/20 p-4 transition-all duration-200 hover:border-primary/40 shadow-2xs">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">Tự động Ẩn Danh Dữ liệu Cá nhân (PII / DLP Redaction)</span>
                    <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-600 bg-indigo-500/10">Privacy Guard</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Tự động nhận diện và thay thế số CCCD, mã số thuế, số thẻ ngân hàng, email, số điện thoại bằng nhãn ẩn danh giả lập trước khi truyền payload lên Cloud LLM.
                  </p>
                </div>
                <Switch
                  checked={piiMasking}
                  onCheckedChange={setPiiMasking}
                  aria-label="Toggle PII Masking"
                />
              </div>

              {/* Live DLP Demo Box */}
              {piiMasking && (
                <div className="mt-3 rounded-xl border border-border/60 bg-background/80 p-3 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ScanEye className="h-3.5 w-3.5 text-indigo-500" />
                      Mô phỏng Mã hóa Ẩn danh (DLP Stream Inspector):
                    </span>
                    <Badge variant="secondary" className="text-[9px]">Zero Leaks</Badge>
                  </div>
                  <div className="space-y-1.5 font-mono text-[10px] leading-relaxed">
                    <div className="rounded bg-muted/40 p-2 text-muted-foreground">
                      <strong className="text-foreground">Input:</strong> "Thanh toán 50tr cho ông Nguyễn Văn A (CCCD: 001201012345, STK: 0071001234567)"
                    </div>
                    <div className="rounded border border-indigo-500/30 bg-indigo-500/5 p-2 text-indigo-950 dark:text-indigo-200">
                      <strong className="text-indigo-600">Cloud Payload:</strong> "Thanh toán 50tr cho <span className="bg-indigo-500/20 px-1 py-0.5 rounded font-bold">[PERSON_1]</span> (CCCD: <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-bold">[CCCD_REDACTED]</span>, STK: <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded font-bold">[BANK_ACCOUNT_REDACTED]</span>)"
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Guard 3: Hallucination Check */}
            <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card to-muted/20 p-4 transition-all duration-200 hover:border-primary/40 shadow-2xs">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">Kiểm soát Ảo giác (Hallucination Detection)</span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/10">Output Guard</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Đo lường mức độ bám sát trích dẫn (Faithfulness score). Tự động từ chối câu trả lời nếu mô hình tự bịa đặt thông tin nằm ngoài phạm vi tài liệu doanh nghiệp.
                  </p>
                </div>
                <Switch
                  checked={hallucinationCheck}
                  onCheckedChange={setHallucinationCheck}
                  aria-label="Toggle Hallucination Detection"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" className="shadow-xs" onClick={handleSave}>
                Lưu Thay đổi Guardrails
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Policy Cards */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="shadow-xs border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  Chính sách Quyền riêng tư (Zero Retention)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0 text-xs">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Zero Data Retention (ZDR)</span>
                  <Switch
                    checked={zeroRetention}
                    onCheckedChange={setZeroRetention}
                    aria-label="Toggle Zero Data Retention"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Bắt buộc nhà cung cấp Cloud (OpenAI, Google) cam kết theo thỏa thuận Enterprise: Không lưu trữ nhật ký hội thoại trên máy chủ của họ và không dùng dữ liệu nội bộ để huấn luyện mô hình.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-emerald-700 text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  Chuẩn Mã hóa AES-256 GCM
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Toàn bộ bản ghi hội thoại và metadata đều được mã hóa bằng khóa riêng của doanh nghiệp trước khi ghi vào cơ sở dữ liệu PostgreSQL của hệ điều hành Arda.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
