import { useState } from "react"
import type { Device } from "@/features/settings/api/session"
import { translateApiError } from "@workspace/i18n"
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
import { Laptop, Smartphone, Globe, ShieldCheck, Calendar, Clock } from "lucide-react"
import { useDeleteDevice, useDevices, useTrustDevice } from "./queries"

function formatDeviceName(device: Device) {
  const name = device.deviceName?.trim()
  if (name && name !== "Unknown Device") {
    return name
  }
  if (device.browser && device.os) {
    return `${device.browser} on ${device.os}`
  }
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
  const [deleteTarget, setDeleteTarget] = useState<Device | null>(null)
  const devicesQuery = useDevices()
  const trustDeviceMutation = useTrustDevice()
  const deleteDeviceMutation = useDeleteDevice()
  const devices = devicesQuery.data?.devices ?? []

  const handleTrust = async (id: string) => {
    await trustDeviceMutation.mutateAsync(id)
  }

  const handleDelete = async (id: string) => {
    await deleteDeviceMutation.mutateAsync(id)
    setDeleteTarget(null)
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

  if (devicesQuery.isLoading) return <div className="flex justify-center p-8"><Spinner className="size-6" /></div>
  if (devicesQuery.error) return <div className="text-destructive p-4">{translateApiError(devicesQuery.error)}</div>

  return (
    <div className="max-w-4xl space-y-6">
      <div className="border-b border-muted/50 pb-5">
        <h1 className="text-2xl font-bold tracking-tight">Recognized Devices</h1>
        <p className="text-sm text-muted-foreground">Browsers and devices recognized from your recent sign-ins. Trusted devices skip MFA verification.</p>
      </div>

      <div className="grid gap-4">
        {devices.length === 0 && <p className="text-muted-foreground text-center py-6 text-sm">No devices found.</p>}
        {devices.map((d) => (
          <Card key={d.id} className="group border-muted/40 transition-all duration-300 hover:shadow-md hover:border-muted-foreground/10 bg-card/50">
            <CardContent className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-muted/50 shrink-0">
                  {getDeviceIcon(d.deviceType)}
                </div>
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-base text-foreground leading-none">{formatDeviceName(d)}</span>
                    <Status variant={d.isTrusted ? "success" : "warning"} className="rounded-full px-2.5">
                      <StatusIndicator />
                      <StatusLabel className="text-[10px] font-bold">
                        {d.isTrusted ? "Trusted for MFA" : "Not trusted"}
                      </StatusLabel>
                    </Status>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {[formatPlatform(d), formatDeviceType(d.deviceType)].filter(Boolean).join(" - ")}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/80">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3 text-muted-foreground/60" />
                      First seen: {new Date(d.firstSeenAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3 text-muted-foreground/60" />
                      Last seen: {new Date(d.lastSeenAt).toLocaleString()}
                    </span>
                  </div>

                  {d.isTrusted && d.trustedUntil && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="size-3" />
                      <span>Trusted until: {new Date(d.trustedUntil).toLocaleString()}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end shrink-0">
                {!d.isTrusted && (
                  <Button variant="outline" size="sm" onClick={() => handleTrust(d.id)} disabled={trustDeviceMutation.isPending} className="rounded-xl border-muted-foreground/20 hover:border-primary hover:text-primary px-3.5 py-4 text-xs font-semibold">
                    Trust Device
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(d)} className="rounded-xl px-3.5 py-4 text-xs font-semibold">
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
              disabled={deleteDeviceMutation.isPending}
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              Remove Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
