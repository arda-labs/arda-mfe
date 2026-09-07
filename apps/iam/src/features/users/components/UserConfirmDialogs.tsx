import type { User } from "../types"
import { useI18n } from "@workspace/i18n"
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

/** Confirmation dialogs for destructive single-row actions (MFA reset, delete). */
export function UserMfaResetDialog({
  target,
  onClose,
  onConfirm,
}: {
  target: User | null
  onClose: () => void
  onConfirm: (target: User) => void
}) {
  const { t } = useI18n()

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("admin.users.mfa.reset_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("admin.users.mfa.reset_description", {
              user: target?.username || target?.email || "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => target && onConfirm(target)}>
            {t("admin.users.action.reset_mfa")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function UserDeleteDialog({
  target,
  deleting,
  onClose,
  onConfirm,
}: {
  target: User | null
  deleting: boolean
  onClose: () => void
  onConfirm: (target: User) => void
}) {
  const { t } = useI18n()

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("common.confirm.delete_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("common.confirm.delete_description", {
              item: target?.username || target?.email || "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleting}
            onClick={() => target && onConfirm(target)}
          >
            {t("common.action.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
