import { translateApiError, useI18n } from "@workspace/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";

type PageErrorDialogProps = {
  open: boolean;
  error: unknown;
  onRetry?: () => void;
  title?: string;
};

export function PageErrorDialog({
  open,
  error,
  onRetry,
  title,
}: PageErrorDialogProps) {
  const { t } = useI18n();
  const message = translateApiError(error);

  return (
    <AlertDialog open={open} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title ?? t("common.error.page_load_title")}
          </AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
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
  );
}
