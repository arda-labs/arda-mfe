import { useI18n, translateApiError } from "@workspace/i18n"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { useErrorDialogStore } from "./error-dialog-store"
import {
  buildErrorAiPrompt,
  ErrorDialogAskAiButton,
  ErrorDialogDetails,
  ErrorDialogIcon,
  readErrorDetails,
} from "./error-dialog-parts"

// 1 instance mount ở shell. showErrorDialog() mở imperatively.
// Hiển thị message đã translate + chi tiết kỹ thuật (code, HTTP, screen,
// trace_id copyable, link docs) + nút "Hỏi AI" khi shell bật assistant.
// Validation errors (có fields) KHÔNG nên vào đây — callers đó dùng
// form.setError + notify.warning.

export function GlobalErrorDialog() {
  const { t } = useI18n()
  const { open, error, title, retry, dismiss } = useErrorDialogStore()

  const message = translateApiError(error)
  const details = readErrorDetails(error, message)
  const prompt = buildErrorAiPrompt(details, t)

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && dismiss()}>
      <AlertDialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <AlertDialogHeader className="flex-row items-start gap-3 space-y-0 border-b bg-muted/40 px-5 py-4 text-left">
          <ErrorDialogIcon />
          <div className="min-w-0 flex-1 space-y-1">
            <AlertDialogTitle className="text-base leading-tight">
              {title ?? t("common.error.page_load_title")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <p className="text-sm text-muted-foreground">{message}</p>
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="px-5 py-4">
          <ErrorDialogDetails details={details} />
        </div>

        <AlertDialogFooter className="flex-row items-center gap-2 border-t bg-muted/20 px-5 py-3 sm:space-x-0">
          <div className="mr-auto">
            <ErrorDialogAskAiButton prompt={prompt} onAsked={dismiss} />
          </div>
          <AlertDialogCancel onClick={dismiss}>
            {t("common.action.close")}
          </AlertDialogCancel>
          {retry ? (
            <AlertDialogAction onClick={() => retry()}>
              {t("common.action.retry")}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
