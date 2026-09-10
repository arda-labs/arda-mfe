import { useState } from "react"
import { api, type ApiSuccess } from "@workspace/api"
import { useAuthStore } from "@workspace/auth/store"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"

export function EmailDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const { updateUser } = useAuthStore()
  const [newEmail, setNewEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const handleChangeEmail = async () => {
    const email = newEmail.trim()
    if (!email) {
      setError("Email is required")
      return
    }

    setError(null)
    setUpdating(true)
    try {
      const response = await api.put<ApiSuccess<{ email: string }>>(
        "/api/identity/me/email",
        { email }
      )
      const updated = response.result
      updateUser({ email: updated.email })
      onOpenChange(false)
      setNewEmail("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update email")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change email address</DialogTitle>
          <DialogDescription>
            Use an email address you can access for security notifications.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label
            htmlFor="new-email"
            className="text-xs font-medium text-muted-foreground"
          >
            New email
          </Label>
          <Input
            id="new-email"
            type="email"
            placeholder="email@example.com"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
          />
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.action.cancel")}
          </Button>
          <Button onClick={handleChangeEmail} disabled={updating}>
            {updating ? <Spinner className="mr-2 size-4" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
