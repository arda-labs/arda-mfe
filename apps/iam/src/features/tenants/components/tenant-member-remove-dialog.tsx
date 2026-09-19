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

type TenantMemberRemoveDialogProps = {
  count: number
  tenantName: string
  onCancel: () => void
  onConfirm: () => void
}

export function TenantMemberRemoveDialog({
  count,
  tenantName,
  onCancel,
  onConfirm,
}: TenantMemberRemoveDialogProps) {
  const { t } = useI18n()

  return (
    <AlertDialog
      open={count > 0}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("iam.tenants.members.remove_confirm_title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("iam.tenants.members.remove_confirm_body", {
              count,
              tenant: tenantName,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            {t("common.action.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
