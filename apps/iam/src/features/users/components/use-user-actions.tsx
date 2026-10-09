import { useCallback, useMemo, useState, type ReactNode } from "react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { usersApi } from "../api"
import type { User } from "../types"
import { UserIdentityDialog } from "./UserIdentityDialog"
import { UserRolesDialog } from "./UserRolesDialog"
import { UserScopeDialog } from "./UserScopeDialog"
import { UserSessionsDialog } from "./UserSessionsDialog"
import { UserDeleteDialog, UserMfaResetDialog } from "./UserConfirmDialogs"
import type { UserRowActionHandlers } from "./UserRowActions"

type UseUserActionsOptions = {
  /** Open the user for editing (list: navigate to the detail page). */
  onEdit: (user: User) => void
  /** Open the detail page (list only). */
  onView?: (user: User) => void
  /** A mutation changed the user (status, roles dialog closed...). */
  onChanged: () => void
  /** The user was deleted. */
  onDeleted?: (user: User) => void
}

/**
 * Shared row/record actions (roles, sessions, scope, password, MFA, identity,
 * status, delete) with their confirmation dialogs, used by both the users list
 * and the user detail page.
 */
export function useUserActions({
  onEdit,
  onView,
  onChanged,
  onDeleted,
}: UseUserActionsOptions): { handlers: UserRowActionHandlers; dialogs: ReactNode } {
  const { t } = useI18n()
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [mfaResetTarget, setMfaResetTarget] = useState<User | null>(null)
  const [provisionTarget, setProvisionTarget] = useState<User | null>(null)
  const [roleTarget, setRoleTarget] = useState<User | null>(null)
  const [sessionTarget, setSessionTarget] = useState<User | null>(null)
  const [scopeTarget, setScopeTarget] = useState<User | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleSetStatus = useCallback(
    async (user: User, nextStatus: "ACTIVE" | "DISABLED") => {
      try {
        await usersApi.updateUser(user.id, user.tenantId, {
          status: nextStatus,
        })
        notify.success(
          nextStatus === "ACTIVE"
            ? t("admin.users.enable_success")
            : t("admin.users.disable_success")
        )
        onChanged()
      } catch (err) {
        notify.error(t("admin.users.update_failed"), translateApiError(err))
      }
    },
    [t, onChanged]
  )

  const handleDelete = async (user: User) => {
    setDeleting(true)
    try {
      await usersApi.deleteUser(user.id, user.tenantId)
      notify.success(t("admin.users.delete_success"))
      setDeleteTarget(null)
      onChanged()
      onDeleted?.(user)
    } catch (err) {
      notify.error(t("admin.users.delete_failed"), translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const handleResetPassword = async (target: User, password: string) => {
    try {
      await usersApi.resetUserPassword(target.id, target.tenantId, password)
      notify.success(t("admin.users.identity.reset_success"))
      setResetTarget(null)
    } catch (err) {
      notify.error(
        t("admin.users.identity.reset_failed"),
        translateApiError(err)
      )
    }
  }

  const handleResetMFA = (target: User) => {
    void usersApi
      .resetUserMFA(target.id, target.tenantId)
      .then(() => {
        notify.success(t("admin.users.mfa.reset_success"))
        setMfaResetTarget(null)
      })
      .catch((err: unknown) =>
        notify.error(t("admin.users.mfa.reset_failed"), translateApiError(err))
      )
  }

  const handleProvisionIdentity = async (target: User, password: string) => {
    try {
      const res = await usersApi.provisionUserIdentity(
        target.id,
        target.tenantId,
        password
      )
      notify.success(
        t("admin.users.identity.provision_success"),
        res.kratosIdentityId
      )
      setProvisionTarget(null)
    } catch (err) {
      notify.error(
        t("admin.users.identity.provision_failed"),
        translateApiError(err)
      )
    }
  }

  // Stable identity: the list's `columns` memoize on this object, and
  // use-data-table derives filter state from `columns` — a fresh object per
  // render would re-run the URL-filter sync effect forever (React error #185).
  const handlers: UserRowActionHandlers = useMemo(
    () => ({
      onView,
      onEdit,
      onManageRoles: setRoleTarget,
      onManageSessions: setSessionTarget,
      onManageScope: setScopeTarget,
      onResetPassword: setResetTarget,
      onResetMfa: setMfaResetTarget,
      onProvisionIdentity: setProvisionTarget,
      onToggleStatus: (user, nextStatus) => {
        void handleSetStatus(user, nextStatus)
      },
      onDelete: setDeleteTarget,
    }),
    [onView, onEdit, handleSetStatus]
  )

  const dialogs = (
    <>
      <UserRolesDialog
        user={roleTarget}
        open={roleTarget !== null}
        onOpenChange={(open) => {
          if (open) return
          setRoleTarget(null)
          onChanged()
        }}
      />
      <UserSessionsDialog
        user={sessionTarget}
        open={sessionTarget !== null}
        onOpenChange={(open) => !open && setSessionTarget(null)}
      />
      <UserScopeDialog
        user={scopeTarget}
        open={scopeTarget !== null}
        onOpenChange={(open) => !open && setScopeTarget(null)}
      />
      <UserIdentityDialog
        kind="reset_password"
        target={resetTarget}
        onClose={() => setResetTarget(null)}
        onSubmit={handleResetPassword}
      />
      <UserIdentityDialog
        kind="provision_identity"
        target={provisionTarget}
        onClose={() => setProvisionTarget(null)}
        onSubmit={handleProvisionIdentity}
      />
      <UserMfaResetDialog
        target={mfaResetTarget}
        onClose={() => setMfaResetTarget(null)}
        onConfirm={handleResetMFA}
      />
      <UserDeleteDialog
        target={deleteTarget}
        deleting={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={(user) => void handleDelete(user)}
      />
    </>
  )

  return { handlers, dialogs }
}
