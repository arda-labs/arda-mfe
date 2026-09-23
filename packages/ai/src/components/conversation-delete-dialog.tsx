import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
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
import { LoaderCircle, Trash2 } from "lucide-react"

// Confirmation for moving a conversation to the trash. Deletes are soft, so
// the copy reassures the user it can be restored.
export function DeleteConversationDialog({
  open,
  title,
  busy = false,
  onOpenChange,
  onConfirm,
}: {
  open: boolean
  title?: string
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const { t } = useI18n()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("ai.threads.delete_confirm_title") || "Xoá cuộc trò chuyện?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("ai.threads.delete_confirm_body", {
              title: title || t("ai.threads.current_new") || "Cuộc trò chuyện này",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("ai.threads.cancel") || "Huỷ"}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              onClick={(event) => {
                event.preventDefault()
                onConfirm()
              }}
            >
              {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              {t("ai.threads.delete")}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
