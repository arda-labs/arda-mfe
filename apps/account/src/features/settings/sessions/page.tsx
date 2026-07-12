import { useCallback, useEffect, useState } from "react"
import type { Session } from "@/features/settings/api"
import { sessionApi } from "@/features/settings/api"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Spinner } from "@workspace/ui/components/spinner"
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
import { Calendar, Clock, Globe, Laptop, MapPin, Smartphone } from "lucide-react"

function formatSessionName(session: Session) {
  if (session.deviceName?.trim()) return session.deviceName
  if (session.browser && session.os) return `${session.browser} on ${session.os}`
  return session.userAgent || "Unknown device"
}

function formatSessionMeta(session: Session) {
  return [session.os, session.browser, session.deviceType].filter(Boolean).join(" - ")
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [revoking, setRevoking] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<Session | "others" | null>(null)

  const loadSessions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await sessionApi.list()
      setSessions(result.sessions)
      setCurrentSessionId(
        result.currentSessionId ?? result.sessions.find((session) => session.isCurrent)?.id ?? null
      )
    } catch (reason) {
      setError(reason)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void sessionApi.list()
      .then((result) => {
        if (cancelled) return
        setSessions(result.sessions)
        setCurrentSessionId(
          result.currentSessionId ?? result.sessions.find((session) => session.isCurrent)?.id ?? null
        )
      })
      .catch((reason) => {
        if (!cancelled) setError(reason)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleRevoke = async (id: string) => {
    setRevoking(true)
    try {
      await sessionApi.revoke(id)
      notify.success("Session revoked")
      setRevokeTarget(null)
      await loadSessions()
    } catch (reason) {
      notify.error(translateApiError(reason))
    } finally {
      setRevoking(false)
    }
  }

  const handleRevokeOthers = async () => {
    if (!currentSessionId) return
    setRevoking(true)
    try {
      await sessionApi.revokeOthers(currentSessionId)
      notify.success("Other sessions revoked")
      setRevokeTarget(null)
      await loadSessions()
    } catch (reason) {
      notify.error(translateApiError(reason))
    } finally {
      setRevoking(false)
    }
  }

  const getDeviceIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "mobile":
      case "phone":
        return <Smartphone className="size-5 text-primary" />
      case "tablet":
        return <Smartphone className="size-5 rotate-90 text-primary" />
      case "browser":
      case "desktop":
        return <Laptop className="size-5 text-primary" />
      default:
        return <Globe className="size-5 text-primary" />
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8"><Spinner className="size-6" /></div>
  }
  if (error) {
    return <div className="p-4 text-destructive">{translateApiError(error)}</div>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-muted/50 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Sessions</h1>
          <p className="text-sm text-muted-foreground">Manage and revoke your active login sessions on various devices</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => setRevokeTarget("others")}
          disabled={!currentSessionId || sessions.length <= 1 || revoking}
          className="rounded-xl py-4 text-xs font-semibold shadow-sm"
        >
          Logout all other devices
        </Button>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No active sessions.</p>}
        {sessions.map((session) => (
          <Card key={session.id} className={`group border-muted/40 transition-all duration-300 hover:border-muted-foreground/10 hover:shadow-md ${session.isCurrent ? "border-primary/20 bg-primary/5" : "bg-card/50"}`}>
            <CardContent className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center md:p-6">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 rounded-2xl p-3 ${session.isCurrent ? "bg-primary/10" : "bg-muted/50"}`}>
                  {getDeviceIcon(session.deviceType)}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base leading-none font-semibold text-foreground">{formatSessionName(session)}</span>
                    <Status variant={session.isCurrent ? "success" : "default"} className="rounded-full px-2.5">
                      <StatusIndicator />
                      <StatusLabel className="text-[10px] font-bold">{session.isCurrent ? "Current" : "Active"}</StatusLabel>
                    </Status>
                    {session.isTrusted && (
                      <Status variant="success" className="rounded-full border-emerald-500/20 bg-emerald-500/10 px-2.5 text-emerald-600">
                        <StatusIndicator className="bg-emerald-500" />
                        <StatusLabel className="text-[10px] font-bold">Trusted</StatusLabel>
                      </Status>
                    )}
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">{formatSessionMeta(session) || "Browser session"}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="size-3 text-muted-foreground/75" />IP: {session.ipAddress}</span>
                    <span className="flex items-center gap-1"><Clock className="size-3 text-muted-foreground/75" />Last seen: {session.lastSeenAt ? new Date(session.lastSeenAt).toLocaleString() : "now"}</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                    <Calendar className="size-3 text-muted-foreground/50" />
                    <span>Created: {new Date(session.createdAt).toLocaleString()}</span>
                    <span className="text-muted-foreground/30">•</span>
                    <span>Expires: {new Date(session.expiresAt).toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-end">
                {!session.isCurrent ? (
                  <Button variant="outline" size="sm" onClick={() => setRevokeTarget(session)} disabled={revoking} className="rounded-xl border-muted-foreground/20 px-4 py-4 text-xs font-semibold transition-colors hover:border-destructive hover:bg-destructive hover:text-destructive-foreground">
                    Revoke
                  </Button>
                ) : (
                  <span className="rounded-xl bg-primary/10 px-3 py-1 text-xs font-semibold text-primary/80">Current Session</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={revokeTarget !== null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm session revocation</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget === "others"
                ? "This will instantly log out all other active sessions across your account. You will remain logged in on this browser."
                : `Are you sure you want to end the session on ${revokeTarget && formatSessionName(revokeTarget)}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={revoking}
              onClick={() => {
                if (revokeTarget === "others") void handleRevokeOthers()
                else if (revokeTarget) void handleRevoke(revokeTarget.id)
              }}
            >
              Revoke Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
