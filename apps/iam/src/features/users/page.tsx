import { useCallback, useState } from "react"
import { downloadFile } from "@workspace/api"
import { useAppQueryClient } from "@workspace/query/provider"
import { translateApiError, useI18n } from "@workspace/i18n"
import { useAuthStore } from "@workspace/auth/store"
import { usersApi } from "./api"
import { usersListDefinition } from "./list-query"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { useServerDataTable } from "@workspace/admin-list/server-data-table"
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { SearchCheck } from "lucide-react"
import { useUserColumns } from "./components/user-columns"
import { UsersBatchActions } from "./components/UsersBatchActions"
import { CreateUserDialog } from "./components/CreateUserDialog"
import { EditUserDialog } from "./components/EditUserDialog"
import { UserRolesDialog } from "./components/UserRolesDialog"
import { UserSessionsDialog } from "./components/UserSessionsDialog"
import { UserIdentityDialog } from "./components/UserIdentityDialog"
import {
  UserDeleteDialog,
  UserMfaResetDialog,
} from "./components/UserConfirmDialogs"
import { IdentityAuditDialog } from "./components/IdentityAuditDialog"
import type { UserRowActionHandlers } from "./components/UserRowActions"
import type { CreateUserValues, EditUserValues } from "./schema"
import type {
  IdentityConsistencyIssue,
  User,
} from "./types"

const USERS_QUERY_KEY = ["iam", "users", "list"]

export function UsersPage() {
  const { t } = useI18n()
  const actorTenantId = useAuthStore((state) => state.user?.tenantId ?? "")
  const queryClient = useAppQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [mfaResetTarget, setMfaResetTarget] = useState<User | null>(null)
  const [provisionTarget, setProvisionTarget] = useState<User | null>(null)
  const [roleTarget, setRoleTarget] = useState<User | null>(null)
  const [sessionTarget, setSessionTarget] = useState<User | null>(null)
  const [identityIssues, setIdentityIssues] = useState<
    IdentityConsistencyIssue[] | null
  >(null)
  const [identityAuditOpen, setIdentityAuditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  /** Mutations refresh the list through the shared TanStack Query cache. */
  const invalidateList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY })
  }, [queryClient])

  const handleCreate = async (values: CreateUserValues) => {
    try {
      await usersApi.createUser(values)
      notify.success(t("admin.users.create_success"))
      invalidateList()
    } catch (err) {
      notify.error(t("admin.users.create_failed"), translateApiError(err))
    }
  }

  const handleEdit = async (values: EditUserValues) => {
    if (!editTarget) return
    try {
      await usersApi.updateUser(editTarget.id, editTarget.tenantId, {
        username: values.username.trim(),
        email: values.email.trim(),
        firstName: values.firstName?.trim() || "",
        lastName: values.lastName?.trim() || "",
        nickname: values.nickname?.trim() || "",
        gender: values.gender?.trim() || "",
        country: values.country?.trim() || "",
        address: values.address?.trim() || "",
        position: values.position?.trim() || "",
        status: values.status,
        tenantId: values.tenantId.trim(),
      })
      notify.success(t("admin.users.update_success"))
      invalidateList()
    } catch (err) {
      notify.error(t("admin.users.update_failed"), translateApiError(err))
    }
  }

  const handleSetStatus = async (
    user: User,
    nextStatus: "ACTIVE" | "DISABLED"
  ) => {
    try {
      await usersApi.updateUser(user.id, user.tenantId, {
        status: nextStatus,
      })
      notify.success(
        nextStatus === "ACTIVE"
          ? t("admin.users.enable_success")
          : t("admin.users.disable_success")
      )
      invalidateList()
    } catch (err) {
      notify.error(t("admin.users.update_failed"), translateApiError(err))
    }
  }

  const handleDelete = async (user: User) => {
    setDeleting(true)
    try {
      await usersApi.deleteUser(user.id, user.tenantId)
      notify.success(t("admin.users.delete_success"))
      setDeleteTarget(null)
      invalidateList()
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

  const handleAuditIdentity = async () => {
    try {
      const res = await usersApi.auditIdentityConsistency()
      setIdentityIssues(res.issues ?? [])
      setIdentityAuditOpen(true)
      if (res.ok) {
        notify.success(t("admin.users.identity.audit_clean"))
      } else {
        notify.info(t("admin.users.identity.audit_issues_found"))
      }
    } catch (err) {
      notify.error(t("admin.users.identity.audit_failed"), translateApiError(err))
    }
  }

  const rowHandlers: UserRowActionHandlers = {
    onEdit: setEditTarget,
    onManageRoles: setRoleTarget,
    onManageSessions: setSessionTarget,
    onResetPassword: setResetTarget,
    onResetMfa: setMfaResetTarget,
    onProvisionIdentity: setProvisionTarget,
    onToggleStatus: (user, nextStatus) => {
      void handleSetStatus(user, nextStatus)
    },
    onDelete: setDeleteTarget,
  }

  const columns = useUserColumns(rowHandlers)

  /**
   * Server-driven list controller: URL page/perPage + `username`→q + `status`
   * filters <-> TanStack Query cache, cancellation, dedupe and previous-page
   * placeholder handled by @workspace/admin-list. The page owns columns,
   * dialogs and row actions only.
   */
  const {
    total,
    isLoading,
    isFetching,
    error: loadError,
    refetch,
    table,
    query,
  } = useServerDataTable<User>({
    ...usersListDefinition,
    columns,
    queryFn: async (listQuery) =>
      usersApi.listUsers({
        page: listQuery.page,
        perPage: listQuery.perPage,
        q: listQuery.q === undefined ? undefined : String(listQuery.q),
        status:
          listQuery.status === undefined ? undefined : String(listQuery.status),
        sort: listQuery.sort,
        order: listQuery.order,
        tenantId: actorTenantId,
      }),
  })

  return (
    <ListPageShell
      title={t("admin.users.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("admin.users.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={loadError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("admin.users.load_failed")}
      fetching={isFetching}
      table={table}
      batchActions={(batchTable) => <UsersBatchActions table={batchTable} />}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("admin.users.create")}
          exportFilename={t("admin.users.title")}
          sheetName={t("admin.users.title")}
          reportTitle={t("iam.users.export.report_title")}
          totalRowsCount={total}
          onServerExport={async ({ format, filename }) => {
            const exportUrl = usersApi.getExportUrl({
              search: query.q === undefined ? undefined : String(query.q),
              status:
                query.status === undefined ? undefined : String(query.status),
              sort: query.sort,
              order: query.order,
              format,
              tenantId: actorTenantId,
            })
            await downloadFile(exportUrl, {
              filename: filename
                ? filename.endsWith(`.${format}`)
                  ? filename
                  : `${filename}.${format}`
                : undefined,
              fallbackFilename: `users_export.${format}`,
            })
          }}
        >
          <Button
            variant="outline"
            onClick={() => void handleAuditIdentity()}
            className="h-8 px-3 text-xs font-semibold"
          >
            <SearchCheck className="mr-2 size-3.5" />
            {t("admin.users.action.audit_identity")}
          </Button>
        </ListTableToolbar>
      }
      dialogs={
        <>
          <CreateUserDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onSubmit={handleCreate}
          />
          <EditUserDialog
            user={editTarget}
            open={editTarget !== null}
            onOpenChange={(open) => !open && setEditTarget(null)}
            onSubmit={handleEdit}
          />
          <UserRolesDialog
            user={roleTarget}
            open={roleTarget !== null}
            onOpenChange={(open) => !open && setRoleTarget(null)}
          />
          <UserSessionsDialog
            user={sessionTarget}
            open={sessionTarget !== null}
            onOpenChange={(open) => !open && setSessionTarget(null)}
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
          <IdentityAuditDialog
            open={identityAuditOpen}
            onOpenChange={setIdentityAuditOpen}
            identityIssues={identityIssues}
          />
        </>
      }
    />
  )
}
