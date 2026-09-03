import { useState } from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Switch } from "@workspace/ui/components/switch"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  CheckCircle2,
  FileText,
  Lock,
  Shield,
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
        <Card className="shadow-xs lg:col-span-8 border-border min-w-0">
          <CardHeader className="pb-3 border-b border-border/70">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-foreground shrink-0" />
                <div>
                  <CardTitle className="text-sm font-semibold">
                    Kiểm soát An toàn & Tuân thủ Dữ liệu (Enterprise Guardrails & DLP)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Kiểm soát 2 chiều (Input / Output) ngăn chặn rò rỉ dữ liệu mật và các cuộc tấn công vượt quyền
                  </CardDescription>
                </div>
              </div>
              <Status variant="success" className="text-[10px]">
                <StatusIndicator />
                <StatusLabel>Chính sách Hoạt động</StatusLabel>
              </Status>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            {/* Guard 1: Prompt Injection */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">Phát hiện & Chặn Prompt Injection / Jailbreak</span>
                    <Badge variant="outline" className="text-[10px] font-mono">Input Guard</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Phân tích ngữ cảnh câu lệnh người dùng qua mô hình an toàn để vô hiệu hóa các kỹ thuật bẻ khóa (jailbreak), bypass vai trò và ép AI tiết lộ system prompt bí mật.
                  </p>
                </div>
                <Switch
                  checked={promptInjectionDefense}
                  onCheckedChange={setPromptInjectionDefense}
                  aria-label="Toggle Prompt Injection Defense"
                />
              </div>

              {promptInjectionDefense && (
                <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-3">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
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
                  <span className="font-mono font-bold text-foreground">{injectionThreshold}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">(Mặc định ngân hàng: 0.85)</span>
                </div>
              )}
            </div>

            {/* Guard 2: PII / DLP */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">Tự động Ẩn Danh Dữ liệu Cá nhân & Tài khoản (PII / DLP)</span>
                    <Badge variant="outline" className="text-[10px] font-mono">Privacy Guard</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Tự động nhận diện và che giấu số CCCD, mã số thuế, số tài khoản ngân hàng, mật khẩu bằng nhãn ẩn danh giả lập trước khi truyền payload ra ngoài.
                  </p>
                </div>
                <Switch
                  checked={piiMasking}
                  onCheckedChange={setPiiMasking}
                  aria-label="Toggle PII Masking"
                />
              </div>

              {/* Technical DLP Audit Log Inspector */}
              {piiMasking && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground border-b border-border/60 pb-1.5">
                    <span className="flex items-center gap-1.5 font-mono text-foreground">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Kiểm định Luồng Dữ liệu DLP (Data Loss Prevention Audit Log):
                    </span>
                    <span className="font-mono text-[9.5px]">Zero Information Leakage</span>
                  </div>
                  <div className="space-y-1.5 font-mono text-[10.5px] leading-relaxed">
                    <div className="rounded border border-border bg-background p-2 text-muted-foreground">
                      <strong className="text-foreground">Dữ liệu gốc người dùng:</strong> "Thực hiện giải ngân 500tr cho ông Nguyễn Văn A (CCCD: 001201012345, STK: 0071001234567)"
                    </div>
                    <div className="rounded border border-border bg-card p-2 text-foreground">
                      <strong className="text-foreground">Payload gửi đến LLM:</strong> "Thực hiện giải ngân 500tr cho <span className="border rounded px-1 py-0.5 bg-muted font-bold">[PERSON_1]</span> (CCCD: <span className="border rounded px-1 py-0.5 bg-muted font-bold">[CCCD_REDACTED]</span>, STK: <span className="border rounded px-1 py-0.5 bg-muted font-bold">[BANK_ACCOUNT_REDACTED]</span>)"
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Guard 3: Hallucination Check */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">Kiểm soát Ảo giác (Hallucination Detection)</span>
                    <Badge variant="outline" className="text-[10px] font-mono">Output Guard</Badge>
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
              <Button size="sm" className="text-xs" onClick={handleSave}>
                Lưu Thay đổi Guardrails
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Policy Cards */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-foreground" />
                <CardTitle className="text-sm font-semibold">
                  Chính sách Quyền riêng tư (Zero Retention)
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
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

              <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  Mã hóa Chuẩn Ngân hàng AES-256 GCM
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Toàn bộ bản ghi hội thoại và metadata đều được mã hóa bằng khóa bảo mật HSM nội bộ trước khi ghi vào cơ sở dữ liệu PostgreSQL của hệ điều hành Arda.
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>Tuân thủ: ISO 27001 • GDPR</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
