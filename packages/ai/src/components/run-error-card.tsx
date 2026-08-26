import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { AlertTriangle, RefreshCw, HelpCircle, Split, ShieldAlert } from "lucide-react"
import { resolveAiError, type AiErrorMeta } from "../errors"

export type RunErrorCardProps = {
  error: string
  onRetry?: () => void
  onRephrase?: () => void
  onSplitQuery?: () => void
  className?: string
}

export function RunErrorCard({
  error,
  onRetry,
  onRephrase,
  onSplitQuery,
  className,
}: RunErrorCardProps) {
  const { t } = useI18n()
  const meta: AiErrorMeta = resolveAiError(error)

  const message = t(meta.i18nKey) || getFallbackErrorMessage(meta.i18nKey, error)

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
                <span>{t("ai.action.retry") || "Thử lại"}</span>
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
                <span>{t("ai.action.rephrase") || "Sửa câu hỏi"}</span>
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
                <span>{t("ai.action.split_query") || "Chia nhỏ yêu cầu"}</span>
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
    case "ai.error.tool_forbidden":
      return "Bạn không có quyền thực hiện thao tác này."
    case "ai.error.step_limit":
      return "Yêu cầu quá phức tạp để xử lý trong một lần. Hãy chia nhỏ câu hỏi thành các bước riêng biệt."
    case "ai.error.sandbox_quota":
      return "Tác vụ vượt quá giới hạn tài nguyên xử lý. Vui lòng thu hẹp phạm vi dữ liệu cần xử lý."
    case "ai.error.rate_limited":
      return "Hệ thống đang nhận quá nhiều yêu cầu. Vui lòng đợi một lát trước khi gửi lại."
    case "ai.error.budget_exceeded":
      return "Tài khoản đã đạt hạn mức sử dụng AI trong tháng."
    default:
      return raw || "Đã xảy ra lỗi trong quá trình xử lý yêu cầu."
  }
}
