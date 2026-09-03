import { useState } from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import {
  CheckCircle2,
  Lock,
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="shadow-xs lg:col-span-8">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Rào chắn An toàn Doanh nghiệp (Enterprise Guardrails)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Lớp kiểm soát bảo mật hai chiều (Input / Output) ngăn chặn rò rỉ dữ liệu và tấn công Prompt Injection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Phát hiện & Chặn Prompt Injection / Jailbreak</span>
                  <Badge variant="outline" className="text-[10px]">Input Guard</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Phân tích câu lệnh đầu vào của người dùng qua mô hình phân loại an toàn nhằm ngăn chặn các kỹ thuật bẻ khóa (jailbreak), bypass role, và ép AI tiết lộ system prompt.
                </p>
                {promptInjectionDefense && (
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[11px] font-medium text-muted-foreground">Ngưỡng nhạy cảm (Threshold):</span>
                    <input
                      type="range"
                      min="0.6"
                      max="0.95"
                      step="0.05"
                      value={injectionThreshold}
                      onChange={(e) => setInjectionThreshold(parseFloat(e.target.value))}
                      className="w-32"
                    />
                    <span className="font-mono font-semibold text-primary">{injectionThreshold}</span>
                  </div>
                )}
              </div>
              <Button
                variant={promptInjectionDefense ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPromptInjectionDefense(!promptInjectionDefense)}
              >
                {promptInjectionDefense ? "Đang bật" : "Đã tắt"}
              </Button>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Tự động Ẩn Danh Thông tin Cá nhân (PII / DLP Redaction)</span>
                  <Badge variant="outline" className="text-[10px]">Privacy Guard</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tự động nhận diện và ẩn danh hóa số CCCD/CMND, mã số thuế, số thẻ ngân hàng, số điện thoại và mật khẩu bằng nhãn giả lập trước khi gửi payload lên Cloud LLM.
                </p>
              </div>
              <Button
                variant={piiMasking ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPiiMasking(!piiMasking)}
              >
                {piiMasking ? "Đang bật" : "Đã tắt"}
              </Button>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">Kiểm soát Ảo giác (Hallucination Detection)</span>
                  <Badge variant="outline" className="text-[10px]">Output Guard</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Đánh giá câu trả lời của AI dựa trên đoạn trích dẫn nguồn (grounding check). Tự động từ chối nếu mô hình tự bịa đặt thông tin không có trong tài liệu doanh nghiệp.
                </p>
              </div>
              <Button
                variant={hallucinationCheck ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setHallucinationCheck(!hallucinationCheck)}
              >
                {hallucinationCheck ? "Đang bật" : "Đã tắt"}
              </Button>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={handleSave}>
                Lưu Thay đổi Guardrails
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Chính sách Quyền riêng tư (Zero Retention)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Zero Data Retention (ZDR)</span>
                <Button
                  variant={zeroRetention ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[11px]"
                  onClick={() => setZeroRetention(!zeroRetention)}
                >
                  {zeroRetention ? "Kích hoạt" : "Tắt"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Yêu cầu nhà cung cấp Cloud (OpenAI, Google) cam kết theo thỏa thuận Enterprise: Không lưu trữ nhật ký hội thoại trên máy chủ của họ và không sử dụng dữ liệu doanh nghiệp để huấn luyện mô hình.
              </p>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-700 text-xs">
                <CheckCircle2 className="h-4 w-4" />
                Tuân thủ Tiêu chuẩn ISO & GDPR
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Tất cả các bản ghi hội thoại và metadata đều được mã hóa bằng AES-256 GCM trước khi ghi vào cơ sở dữ liệu PostgreSQL của hệ điều hành Arda.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
