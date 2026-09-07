import { useCallback, useEffect, useState } from "react"
import type { User } from "../types"
import type { Role } from "../../roles/types"
import { rolesApi } from "../../roles/api"
import { notify } from "@workspace/ui/feedback/notify"
import { translateApiError, useI18n } from "@workspace/i18n"
import { usersApi } from "../api"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

type UserRolesDialogProps = {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Self-contained role assignment dialog: loads the tenant role catalog when
 * opened and toggles assignments on the user, keeping an optimistic local
 * copy of the user's role codes.
 */
export function UserRolesDialog({
  user,
  open,
  onOpenChange,
}: UserRolesDialogProps) {
  const { t } = useI18n()
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null)
  const [assignedCodes, setAssignedCodes] = useState<string[]>([])

  useEffect(() => {
    if (!open || !user) {
      setAvailableRoles([])
      return
    }
    setAssignedCodes(user.roles)
    let cancelled = false
    setRolesLoading(true)
    rolesApi
      .listRoles({ page: 1, perPage: 100, tenantId: user.tenantId })
      .then((result) => {
        if (!cancelled) setAvailableRoles(result.items ?? [])
      })
      .catch(() => {
        if (!cancelled) setAvailableRoles([])
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, user])

  const toggleRole = useCallback(
    async (role: Role, assigned: boolean) => {
      if (!user) return
      setBusyRoleId(role.id)
      try {
        if (assigned) {
          await usersApi.unassignRole(user.id, role.id, user.tenantId)
        } else {
          await usersApi.assignRole(user.id, role.id, user.tenantId)
        }
        setAssignedCodes((previous) =>
          assigned
            ? previous.filter((code) => code !== role.code)
            : [...previous, role.code]
        )
        notify.success(t("iam.users.roles.update_success"))
      } catch (err) {
        notify.error(t("iam.users.roles.update_failed"), translateApiError(err))
      } finally {
        setBusyRoleId(null)
      }
    },
    [t, user]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("iam.users.roles.title", {
              user: user?.username || user?.email || "",
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {rolesLoading ? (
            <div className="text-sm text-muted-foreground">
              {t("iam.users.roles.loading")}
            </div>
          ) : availableRoles.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {t("iam.users.roles.empty")}
            </div>
          ) : (
            availableRoles.map((role) => {
              const assigned = assignedCodes.includes(role.code)
              return (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={assigned}
                    disabled={busyRoleId === role.id}
                    onCheckedChange={() => toggleRole(role, assigned)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{role.name}</span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      {role.code}
                    </span>
                  </span>
                </label>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
