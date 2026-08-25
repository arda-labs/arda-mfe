import { useI18n } from "@workspace/i18n"
import type { AdminUserSession, User } from "@/features/iam"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

export function UserSessionsDialog({
  user,
  open,
  onOpenChange,
  sessions,
  sessionsLoading,
  onRevokeSessions,
  isBusy,
}: {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  sessions: AdminUserSession[]
  sessionsLoading: boolean
  onRevokeSessions: () => Promise<void>
  isBusy: boolean
}) {
  const { t, formatDate } = useI18n()

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
              onClick={onRevokeSessions}
              disabled={!user || isBusy}
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
