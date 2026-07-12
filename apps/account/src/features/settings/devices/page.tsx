import { useCallback, useEffect, useState } from "react"
import type { Device } from "@/features/settings/api"
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
import { Calendar, Clock, Globe, Laptop, ShieldCheck, Smartphone } from "lucide-react"

function formatDeviceName(device: Device) {
  const name = device.deviceName?.trim()
  if (name && name !== "Unknown Device") return name
  if (device.browser && device.os) return `${device.browser} on ${device.os}`
  return device.browser || device.os || "Web browser"
}

function formatPlatform(device: Device) {
  return [device.os, device.browser].filter(Boolean).join(" - ")
}

function formatDeviceType(deviceType: string) {
  switch (deviceType) {
    case "mobile":
      return "Phone"
    case "tablet":
      return "Tablet"
    case "browser":
      return "Browser"
    default:
      return deviceType
  }
}

export function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [busyDeviceId, setBusyDeviceId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null)

  const loadDevices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await sessionApi.devices()
      setDevices(result.devices)
    } catch (reason) {
      setError(reason)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    void sessionApi.devices()
      .then((result) => {
        if (!cancelled) setDevices(result.devices)
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

  const handleTrust = async (id: string) => {
    setBusyDeviceId(id)
    try {
      await sessionApi.trustDevice(id)
      notify.success("Device trusted")
      await loadDevices()
    } catch (reason) {
      notify.error(translateApiError(reason))
    } finally {
      setBusyDeviceId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setBusyDeviceId(id)
    try {
      await sessionApi.deleteDevice(id)
      notify.success("Device removed")
      setDeleteTarget(null)
      await loadDevices()
    } catch (reason) {
      notify.error(translateApiError(reason))
    } finally {
      setBusyDeviceId(null)
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
      <div className="border-b border-muted/50 pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Recognized Devices</h1>
        <p className="text-sm text-muted-foreground">
          Browsers and devices recognized from your recent sign-ins. Trusted devices skip MFA verification.
        </p>
      </div>

      <div className="grid gap-4">
        {devices.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No devices found.</p>}
        {devices.map((device) => (
          <Card key={device.id} className="group border-muted/40 bg-card/50 transition-all duration-300 hover:border-muted-foreground/10 hover:shadow-md">
            <CardContent className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center md:p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-2xl bg-muted/50 p-3">{getDeviceIcon(device.deviceType)}</div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base leading-none font-semibold text-foreground">{formatDeviceName(device)}</span>
                    <Status variant={device.isTrusted ? "success" : "warning"} className="rounded-full px-2.5">
                      <StatusIndicator />
                      <StatusLabel className="text-[10px] font-bold">
                        {device.isTrusted ? "Trusted for MFA" : "Not trusted"}
                      </StatusLabel>
                    </Status>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {[formatPlatform(device), formatDeviceType(device.deviceType)].filter(Boolean).join(" - ")}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3 text-muted-foreground/60" />
                      First seen: {new Date(device.firstSeenAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3 text-muted-foreground/60" />
                      Last seen: {new Date(device.lastSeenAt).toLocaleString()}
                    </span>
                  </div>
                  {device.isTrusted && device.trustedUntil && (
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="size-3" />
                      <span>Trusted until: {new Date(device.trustedUntil).toLocaleString()}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2">
                {!device.isTrusted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleTrust(device.id)}
                    disabled={busyDeviceId === device.id}
                    className="rounded-xl border-muted-foreground/20 px-3.5 py-4 text-xs font-semibold hover:border-primary hover:text-primary"
                  >
                    Trust Device
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteTarget(device)}
                  disabled={busyDeviceId === device.id}
                  className="rounded-xl px-3.5 py-4 text-xs font-semibold"
                >
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Recognized Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &apos;{deleteTarget ? formatDeviceName(deleteTarget) : "this device"}&apos;? This will immediately revoke any active login sessions tied to this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busyDeviceId === deleteTarget?.id}
              onClick={() => deleteTarget && void handleDelete(deleteTarget.id)}
            >
              Remove Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
