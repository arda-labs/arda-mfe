import { useState } from "react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
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
import { templatesApi } from "../api"
import type { FileTemplate } from "../types"

interface TemplateDeleteDialogProps {
  template: FileTemplate | null
  onOpenChange: (open: boolean) => void
  onDeleted: () => void | Promise<void>
}

export function TemplateDeleteDialog({
  template,
  onOpenChange,
  onDeleted,
}: TemplateDeleteDialogProps) {
  const { t } = useI18n()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!template) return
    setDeleting(true)
    try {
      await templatesApi.deleteFileTemplate(template.id)
      notify.success(t("platform.templates.toast.delete_success"))
      onOpenChange(false)
      await onDeleted()
    } catch (err) {
      notify.error(
        t("platform.templates.toast.delete_failed"),
        translateApiError(err)
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!template} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("platform.templates.delete.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("platform.templates.delete.description", {
              name: template?.name ?? "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("platform.templates.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
