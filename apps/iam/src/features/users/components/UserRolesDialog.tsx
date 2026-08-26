import type { User } from "../types"
import type { Role } from "../../roles/types"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

export function UserRolesDialog({
  user,
  open,
  onOpenChange,
  availableRoles,
  rolesLoading,
  busyRoleId,
  onToggleRole,
}: {
  user: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  availableRoles: Role[]
  rolesLoading: boolean
  busyRoleId: string | null
  onToggleRole: (role: Role, assigned: boolean) => Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Phân vai trò cho {user?.username || user?.email || ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {rolesLoading ? (
            <div className="text-sm text-muted-foreground">
              Đang tải vai trò...
            </div>
          ) : availableRoles.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Chưa có vai trò để gán.
            </div>
          ) : (
            availableRoles.map((role) => {
              const assigned = Boolean(user?.roles.includes(role.code))
              return (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                >
                  <Checkbox
                    checked={assigned}
                    disabled={busyRoleId === role.id}
                    onCheckedChange={() => onToggleRole(role, assigned)}
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
