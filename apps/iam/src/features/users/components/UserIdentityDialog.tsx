import { useEffect, useState } from "react"
import type { User } from "../types"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

type UserIdentityDialogKind = "reset_password" | "provision_identity"

/**
 * Shared dialog for the two Kratos identity flows that take a password input:
 * resetting an existing identity password and provisioning a new identity.
 */
export function UserIdentityDialog({
  kind,
  target,
  onClose,
  onSubmit,
}: {
  kind: UserIdentityDialogKind
  target: User | null
  onClose: () => void
  onSubmit: (target: User, password: string) => Promise<void>
}) {
  const { t } = useI18n()
  const [password, setPassword] = useState("")

  // Fresh input whenever the dialog is (re)opened; the typed password
  // survives a failed submit so the user can retry.
  useEffect(() => {
    setPassword("")
  }, [target])

  const open = target !== null
  const actionLabel =
    kind === "reset_password"
      ? t("admin.users.action.reset_password")
      : t("admin.users.action.provision_identity")
  const descriptionKey =
    kind === "reset_password"
      ? "admin.users.identity.reset_description"
      : "admin.users.identity.provision_description"
  const passwordLabel =
    kind === "reset_password"
      ? t("admin.users.identity.new_password")
      : t("admin.users.identity.temporary_password")

  const handleSubmit = async () => {
    if (!target) return
    await onSubmit(target, password)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionLabel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t(descriptionKey, {
              user: target?.username || target?.email || "",
            })}
          </p>
          <FormField label={passwordLabel}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <Button
            className="w-full"
            onClick={() => void handleSubmit()}
            disabled={!password}
          >
            {actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
