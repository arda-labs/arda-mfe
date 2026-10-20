import { useEffect, useId, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { FormField } from "@workspace/ui/components/form-field"
import { Textarea } from "@workspace/ui/components/textarea"
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

/** Required "reason" input for Operate writes; the reason is recorded on the
 * case timeline together with the actor. */
export function OperateReasonField({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const { t } = useI18n()
  const id = useId()
  return (
    <FormField
      label={t("workflow.operate.reason_label")}
      htmlFor={id}
      required
      description={t("workflow.operate.reason_hint")}
    >
      <Textarea
        id={id}
        className="min-h-20 text-sm"
        value={value}
        maxLength={1000}
        disabled={disabled}
        placeholder={t("workflow.operate.reason_placeholder")}
        onChange={(event) => onChange(event.target.value)}
      />
    </FormField>
  )
}

/** Confirm dialog for cancelling a process instance; confirm stays disabled
 * until a non-blank reason is entered. */
export function CancelInstanceDialog({
  open,
  onOpenChange,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  pending: boolean
  onConfirm: (reason: string) => void
}) {
  const { t } = useI18n()
  const [reason, setReason] = useState("")

  useEffect(() => {
    if (open) setReason("")
  }, [open])

  const blank = reason.trim() === ""

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("workflow.operate.cancel_confirm_title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("workflow.operate.cancel_confirm_description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <OperateReasonField
          value={reason}
          onChange={setReason}
          disabled={pending}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("workflow.operate.cancel_confirm_cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={pending || blank}
            onClick={(event) => {
              event.preventDefault()
              if (!blank) onConfirm(reason.trim())
            }}
          >
            {t("workflow.operate.cancel_confirm_action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
