import { useEffect, useState } from "react"
import type { AdminUserSession, User } from "../types"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { usersApi } from "../api"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

type UserSessionsDialogProps = {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Self-contained sessions dialog: loads the user's active sessions when
 * opened and revokes them in place.
 */
export function UserSessionsDialog({
  user,
  open,
  onOpenChange,
}: UserSessionsDialogProps) {
  const { t, formatDate } = useI18n()
  const [sessions, setSessions] = useState<AdminUserSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [revoking, setRevoking] = useState(false)

  useEffect(() => {
    if (!open || !user) {
      setSessions([])
      return
    }
    let cancelled = false
    setSessionsLoading(true)
    usersApi
      .listUserSessions(user.id, user.tenantId)
      .then((result) => {
        if (!cancelled) setSessions(result.sessions ?? [])
      })
      .catch(() => {
        if (!cancelled) setSessions([])
      })
      .finally(() => {
        if (!cancelled) setSessionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, user])

  const revokeSessions = async () => {
    if (!user) return
    setRevoking(true)
    try {
      await usersApi.revokeUserSessions(user.id, user.tenantId)
      notify.success(t("admin.users.sessions.revoke_success"))
      onOpenChange(false)
    } catch (err) {
      notify.error(t("admin.users.sessions.revoke_failed"), translateApiError(err))
    } finally {
      setRevoking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t("admin.users.sessions.title", {
              user: user?.username || user?.email || "",
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => void revokeSessions()}
              disabled={!user || revoking}
            >
              {t("admin.users.action.revoke_sessions")}
            </Button>
          </div>
          {sessionsLoading ? (
            <div className="text-sm text-muted-foreground">
              {t("admin.users.sessions.loading")}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {t("admin.users.sessions.empty")}
            </div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-auto">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-lg border p-3 text-sm"
                >
                  <div className="font-medium">
                    {session.deviceName || session.deviceId || session.id}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[
                      session.browser,
                      session.os,
                      session.ipAddress,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "-"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("admin.users.sessions.last_seen")}:{" "}
                    {session.lastSeenAt
                      ? formatDate(session.lastSeenAt)
                      : "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
