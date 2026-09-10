import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { AlertTriangle, RefreshCw, HelpCircle, Split, ShieldAlert, Settings } from "lucide-react"
import { resolveAiError, type AiErrorMeta } from "../../lib/errors"

export type RunErrorCardProps = {
  error: string
  onRetry?: () => void
  onRephrase?: () => void
  onSplitQuery?: () => void
  /**
   * Overrides the destination of the "open settings" action. Defaults to the
   * AI Settings page; the chat package has no router dependency by design.
   */
  settingsHref?: string
  className?: string
}

export function RunErrorCard({
  error,
  onRetry,
  onRephrase,
  onSplitQuery,
  settingsHref = "/ai/settings",
  className,
}: RunErrorCardProps) {
  const { t } = useI18n()
  const meta: AiErrorMeta = resolveAiError(error)

  const translated = t(meta.i18nKey)
  const message =
    !translated || translated === meta.i18nKey
      ? getFallbackErrorMessage(meta.i18nKey, error)
      : translated

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`my-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs shadow-2xs motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 ${className || ""}`}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive">
          {meta.severity === "user" ? (
            <HelpCircle className="size-3" />
          ) : meta.severity === "system" ? (
            <ShieldAlert className="size-3" />
          ) : (
            <AlertTriangle className="size-3" />
          )}
        </div>

        <div className="flex-1 space-y-2">
          <p className="font-medium text-foreground leading-relaxed">{message}</p>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {meta.retryable && onRetry && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRetry}
                className="h-7 gap-1 px-2.5 text-xs font-normal text-foreground hover:bg-background"
              >
                <RefreshCw className="size-3" />
                <span>{t("ai.action.retry")}</span>
              </Button>
            )}

            {meta.action === "rephrase" && onRephrase && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onRephrase}
                className="h-7 px-2.5 text-xs font-normal text-foreground hover:bg-background"
              >
                <span>{t("ai.action.rephrase")}</span>
              </Button>
            )}

            {meta.action === "split_query" && onSplitQuery && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSplitQuery}
                className="h-7 gap-1 px-2.5 text-xs font-normal text-foreground hover:bg-background"
              >
                <Split className="size-3" />
                <span>{t("ai.action.split_query")}</span>
              </Button>
            )}

            {meta.action === "open_settings" && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-7 gap-1 px-2.5 text-xs font-normal text-foreground hover:bg-background"
              >
                <a href={settingsHref}>
                  <Settings className="size-3" />
                  <span>{t("ai.action.open_settings")}</span>
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function getFallbackErrorMessage(key: string, raw: string): string {
  switch (key) {
    case "ai.error.model_unavailable":
      return "Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại sau giây lát."
    case "ai.error.model_unauthorized":
      return "Cấu hình model chưa đúng hoặc thiếu quyền. Kiểm tra lại AI Settings."
    case "ai.error.model_rate_limited":
      return "Nhà cung cấp model đang giới hạn tốc độ. Vui lòng thử lại sau ít giây."
    case "ai.error.model_timeout":
      return "Model phản hồi quá chậm. Vui lòng thử lại."
    case "ai.error.run_timeout":
      return "Yêu cầu vượt quá thời gian xử lý. Hãy thử lại hoặc chia nhỏ câu hỏi."
    case "ai.error.tool_forbidden":
      return "Bạn không có quyền thực hiện thao tác này."
    case "ai.error.tool_not_found":
      return "Không tìm thấy công cụ phù hợp cho yêu cầu này."
    case "ai.error.tool_invalid":
      return "Tham số yêu cầu chưa hợp lệ. Hãy diễn đạt lại."
    case "ai.error.step_limit":
      return "Yêu cầu quá phức tạp để xử lý trong một lần. Hãy chia nhỏ câu hỏi thành các bước riêng biệt."
    case "ai.error.sandbox_quota":
      return "Tác vụ vượt quá giới hạn tài nguyên xử lý. Vui lòng thu hẹp phạm vi dữ liệu cần xử lý."
    case "ai.error.sandbox_busy":
      return "Hệ thống đang bận xử lý tác vụ khác. Vui lòng thử lại."
    case "ai.error.sandbox_timeout":
      return "Tác vụ xử lý quá lâu. Hãy chia nhỏ yêu cầu."
    case "ai.error.sandbox_output_too_large":
      return "Kết quả quá lớn để hiển thị. Hãy thu hẹp truy vấn."
    case "ai.error.rate_limited":
      return "Hệ thống đang nhận quá nhiều yêu cầu. Vui lòng đợi một lát trước khi gửi lại."
    case "ai.error.budget_exceeded":
      return "Tài khoản đã đạt hạn mức sử dụng AI trong tháng."
    case "ai.error.quota_exceeded":
      return "Đã đạt hạn mức token AI trong tháng. Vui lòng liên hệ quản trị viên."
    case "ai.error.quota_unavailable":
      return "Dịch vụ hạn mức tạm thời không khả dụng. Vui lòng thử lại."
    case "ai.error.not_ready":
      return "Dịch vụ AI chưa sẵn sàng. Vui lòng thử lại sau ít phút."
    default:
      return raw || "Đã xảy ra lỗi trong quá trình xử lý yêu cầu."
  }
}
