import type { User } from "../types"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Check,
  KeyRound,
  MonitorCog,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react"

export type UserRowActionHandlers = {
  onEdit: (user: User) => void
  onManageRoles: (user: User) => void
  onManageSessions: (user: User) => void
  onManageScope: (user: User) => void
  onResetPassword: (user: User) => void
  onResetMfa: (user: User) => void
  onProvisionIdentity: (user: User) => void
  onToggleStatus: (user: User, nextStatus: "ACTIVE" | "DISABLED") => void
  onDelete: (user: User) => void
}

export function UserRowActions({
  user,
  handlers,
}: {
  user: User
  handlers: UserRowActionHandlers
}) {
  const { t } = useI18n()
  const isActive = user.status === "ACTIVE"

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreHorizontal className="size-4" />
            <span className="sr-only">
              {t("admin.users.action.open_actions")}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handlers.onEdit(user)}>
            <Pencil className="mr-2 size-4" />
            {t("common.action.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlers.onManageRoles(user)}>
            <ShieldCheck className="mr-2 size-4" />
            {t("admin.users.action.roles")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlers.onManageSessions(user)}>
            <MonitorCog className="mr-2 size-4" />
            {t("admin.users.action.sessions")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlers.onManageScope(user)}>
            <ShieldCheck className="mr-2 size-4" />
            {t("admin.users.action.scope")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlers.onResetPassword(user)}>
            <KeyRound className="mr-2 size-4" />
            {t("admin.users.action.reset_password")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlers.onResetMfa(user)}>
            <ShieldOff className="mr-2 size-4" />
            {t("admin.users.action.reset_mfa")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlers.onProvisionIdentity(user)}>
            <ShieldCheck className="mr-2 size-4" />
            {t("admin.users.action.provision_identity")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              handlers.onToggleStatus(user, isActive ? "DISABLED" : "ACTIVE")
            }
          >
            {isActive ? (
              <>
                <X className="mr-2 size-4" />
                {t("admin.users.action.disable")}
              </>
            ) : (
              <>
                <Check className="mr-2 size-4" />
                {t("admin.users.action.enable")}
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => handlers.onDelete(user)}
          >
            <Trash2 className="mr-2 size-4" />
            {t("common.action.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
