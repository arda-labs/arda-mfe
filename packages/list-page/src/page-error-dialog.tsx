import { useState } from "react"
import { translateApiError, useI18n } from "@workspace/i18n"
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
import {
  buildErrorAiPrompt,
  ErrorDialogAskAiButton,
  ErrorDialogDetails,
  ErrorDialogIcon,
  readErrorDetails,
} from "@workspace/ui/feedback/error-dialog-parts"

type PageErrorDialogProps = {
  open: boolean
  error: unknown
  onRetry?: () => void
  title?: string
}

// Sentinel that never equals a real error object.
const NOT_DISMISSED = Symbol("not-dismissed")

/**
 * Blocking error dialog for pages whose critical data never loaded.
 *
 * Shows the translated message plus technical details (error code, HTTP
 * status, route, copyable trace id, problem docs link). When the shell has the
 * Olorin assistant enabled a "Hỏi AI" action prefills the chat with the error
 * context; the dialog hides itself so the assistant panel is not blocked.
 */
export function PageErrorDialog({
  open,
  error,
  onRetry,
  title,
}: PageErrorDialogProps) {
  const { t } = useI18n()
  const message = translateApiError(error)
  const details = readErrorDetails(error, message)
  const prompt = buildErrorAiPrompt(details, t)

  // The dialog is driven by the load state, not a local flag; "ask AI" hides
  // it without clearing the underlying error. Tracking the dismissed error
  // object (instead of a boolean + effect) stays render-derived, and a new
  // error identity automatically re-opens the dialog.
  const [dismissedFor, setDismissedFor] = useState<unknown>(NOT_DISMISSED)
  const dismissed = dismissedFor === error

  return (
    <AlertDialog open={open && !dismissed} onOpenChange={() => {}}>
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
            <ErrorDialogAskAiButton
              prompt={prompt}
              onAsked={() => setDismissedFor(error)}
            />
          </div>
          <AlertDialogCancel onClick={() => window.history.back()}>
            {t("common.action.back")}
          </AlertDialogCancel>
          {onRetry ? (
            <AlertDialogAction onClick={onRetry}>
              {t("common.action.retry")}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
