import { useEffect, useState } from "react"
import { sessionApi } from "@/features/settings/api/session"
import type { Session } from "@/features/settings/api/session"
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
import { Laptop, Smartphone, Globe, MapPin, Calendar, Clock } from "lucide-react"

function formatSessionName(session: Session) {
  if (session.deviceName?.trim()) {
    return session.deviceName
  }
  if (session.browser && session.os) {
    return `${session.browser} on ${session.os}`
  }
  return session.userAgent || "Unknown device"
}

function formatSessionMeta(session: Session) {
  return [session.os, session.browser, session.deviceType].filter(Boolean).join(" - ")
}

export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<Session | "others" | null>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await sessionApi.list()
      setSessions(res.sessions)
      setCurrentSessionId(res.currentSessionId ?? res.sessions.find((s) => s.isCurrent)?.id ?? null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRevoke = async (id: string) => {
    await sessionApi.revoke(id)
    setRevokeTarget(null)
    load()
  }

  const handleRevokeOthers = async () => {
    if (currentSessionId) {
      await sessionApi.revokeOthers(currentSessionId)
      setRevokeTarget(null)
      load()
    }
  }

  const getDeviceIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case "mobile":
      case "phone":
        return <Smartphone className="size-5 text-primary" />
      case "tablet":
        return <Smartphone className="size-5 text-primary rotate-90" />
      case "browser":
      case "desktop":
        return <Laptop className="size-5 text-primary" />
      default:
        return <Globe className="size-5 text-primary" />
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Spinner className="size-6" /></div>
  if (error) return <div className="text-destructive p-4">{error}</div>

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-muted/50 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Active Sessions</h1>
          <p className="text-sm text-muted-foreground">Manage and revoke your active login sessions on various devices</p>
        </div>
        <Button 
          variant="destructive" 
          onClick={() => setRevokeTarget("others")} 
          disabled={!currentSessionId || sessions.length <= 1}
          className="rounded-xl font-semibold shadow-sm text-xs py-4"
        >
          Logout all other devices
        </Button>
      </div>

      <div className="grid gap-4">
        {sessions.length === 0 && <p className="text-muted-foreground text-center py-6 text-sm">No active sessions.</p>}
        {sessions.map((s) => (
          <Card key={s.id} className={`group border-muted/40 transition-all duration-300 hover:shadow-md hover:border-muted-foreground/10 ${s.isCurrent ? "bg-primary/5 border-primary/20" : "bg-card/50"}`}>
            <CardContent className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${s.isCurrent ? "bg-primary/10" : "bg-muted/50"} shrink-0`}>
                  {getDeviceIcon(s.deviceType)}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-base text-foreground leading-none">{formatSessionName(s)}</span>
                    <Status variant={s.isCurrent ? "success" : "default"} className="rounded-full px-2.5">
                      <StatusIndicator />
                      <StatusLabel className="text-[10px] font-bold">{s.isCurrent ? "Current" : "Active"}</StatusLabel>
                    </Status>
                    {s.isTrusted && (
                      <Status variant="success" className="rounded-full px-2.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
                        <StatusIndicator className="bg-emerald-500" />
                        <StatusLabel className="text-[10px] font-bold">Trusted</StatusLabel>
                      </Status>
                    )}
                  </div>
                  
                  <p className="text-xs text-muted-foreground font-medium">
                    {formatSessionMeta(s) || "Browser session"}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-muted-foreground/75" />
                      IP: {s.ipAddress}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3 text-muted-foreground/75" />
                      Last seen: {s.lastSeenAt ? new Date(s.lastSeenAt).toLocaleString() : "now"}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
                    <Calendar className="size-3 text-muted-foreground/50" />
                    <span>Created: {new Date(s.createdAt).toLocaleString()}</span>
                    <span className="text-muted-foreground/30">•</span>
                    <span>Expires: {new Date(s.expiresAt).toLocaleString()}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end shrink-0">
                {!s.isCurrent ? (
                  <Button variant="outline" size="sm" onClick={() => setRevokeTarget(s)} className="rounded-xl border-muted-foreground/20 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors px-4 py-4 text-xs font-semibold">
                    Revoke
                  </Button>
                ) : (
                  <span className="text-xs font-semibold text-primary/80 bg-primary/10 px-3 py-1 rounded-xl">Current Session</span>
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              onClick={() => {
                if (revokeTarget === "others") {
                  void handleRevokeOthers()
                } else if (revokeTarget) {
                  void handleRevoke(revokeTarget.id)
                }
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
