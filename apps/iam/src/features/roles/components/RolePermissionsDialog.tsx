import { useEffect, useMemo, useState } from "react"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { notify } from "@workspace/ui/feedback/notify"
import { translateApiError } from "@workspace/i18n"
import { rolesApi } from "../api"
import { permissionsApi } from "../../permissions/api"
import type { Permission } from "../../permissions/types"
import type { Role } from "../types"

interface RolePermissionsDialogProps {
  role: Role | null
  onClose: () => void
}

/**
 * Permission assignment for a single role. Owns all permission options state
 * (loaded once while a role is targeted) and the assign/unassign mutations;
 * the page only holds which role is open.
 */
export function RolePermissionsDialog({ role, onClose }: RolePermissionsDialogProps) {
  const [catalogue, setCatalogue] = useState<Permission[]>([])
  const [assigned, setAssigned] = useState<Permission[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!role) {
      setCatalogue([])
      setAssigned([])
      return
    }
    let cancelled = false
    setLoading(true)
    void Promise.all([
      permissionsApi.listPermissions({ page: 1, perPage: 100 }),
      rolesApi.listRolePermissions(role.id, role.tenantId),
    ])
      .then(([all, assignedForRole]) => {
        if (cancelled) return
        setCatalogue(all.items)
        setAssigned(assignedForRole.permissions)
      })
      .catch((err) => {
        if (cancelled) return
        notify.error("Không tải được danh sách quyền", translateApiError(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [role])

  const togglePermission = async (permission: Permission, hasRole: boolean) => {
    if (!role) return
    setBusy(permission.id)
    try {
      if (hasRole) {
        await rolesApi.unassignRolePermission(
          role.id,
          permission.id,
          role.tenantId
        )
        setAssigned((previous) =>
          previous.filter((item) => item.id !== permission.id)
        )
      } else {
        await rolesApi.assignRolePermission(
          role.id,
          permission.id,
          role.tenantId
        )
        setAssigned((previous) => [...previous, permission])
      }
      notify.success("Đã cập nhật quyền")
    } catch (err) {
      notify.error("Không cập nhật được quyền", translateApiError(err))
    } finally {
      setBusy(null)
    }
  }

  const byModule = useMemo(() => {
    const groups = new Map<string, Permission[]>()
    for (const permission of catalogue) {
      const key = permission.module || "other"
      groups.set(key, [...(groups.get(key) ?? []), permission])
    }
    return Array.from(groups.entries())
  }, [catalogue])

  return (
    <Dialog open={role !== null} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Phân quyền cho {role?.name || role?.code || ""}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-auto pr-1">
          {loading ? (
            <div className="text-sm text-muted-foreground">
              Đang tải quyền...
            </div>
          ) : catalogue.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Chưa có quyền để gán.
            </div>
          ) : (
            byModule.map(([module, items]) => (
              <section key={module} className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">
                  {module}
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {items.map((permission) => {
                    const hasRole = assigned.some(
                      (item) => item.id === permission.id
                    )
                    return (
                      <label
                        key={permission.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={hasRole}
                          disabled={busy === permission.id}
                          onCheckedChange={() =>
                            togglePermission(permission, hasRole)
                          }
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">
                            {permission.name}
                          </span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {permission.code}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}