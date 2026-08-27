import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { sortToApiParams } from "@workspace/api/list"
import { translateApiError, useI18n } from "@workspace/i18n"
import { useAuthStore } from "@workspace/auth/store"
import { usersApi } from "./api"
import { rolesApi } from "../roles/api"
import type { AdminUserSession, IdentityConsistencyIssue, User } from "./types"
import type { Role } from "../roles/types"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
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
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { useDataTable } from "@workspace/admin-list/use-data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { exportTableToXlsx, generateExportFilename } from "@workspace/admin-list/table-export"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Check,
  X,
  Trash2,
  KeyRound,
  ShieldCheck,
  ShieldOff,
  MonitorCog,
  SearchCheck,
  Pencil,
  MoreHorizontal,
  Download,
  FileSpreadsheet,
} from "lucide-react"
import { CreateUserDialog } from "./components/CreateUserDialog"
import { EditUserDialog } from "./components/EditUserDialog"
import { UserRolesDialog } from "./components/UserRolesDialog"
import { UserSessionsDialog } from "./components/UserSessionsDialog"
import { IdentityAuditDialog } from "./components/IdentityAuditDialog"
import type { CreateUserValues, EditUserValues } from "./schema"

const DEFAULT_PAGE_SIZE = 10

export function UsersPage() {
  const { t, formatDate } = useI18n()
  const actorTenantId = useAuthStore((state) => state.user?.tenantId ?? "")
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
  const [identityPassword, setIdentityPassword] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const hasLoadedRef = useRef(false)
  const [busyUserId] = useState<string | null>(null)
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Role dialog session state
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [sessions, setSessions] = useState<AdminUserSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  const [searchParams] = useSearchParams()
  const POS = (value: string | null, fallback: number) => {
    const n = Number.parseInt(value ?? "", 10)
    return Number.isFinite(n) && n > 0 ? n : fallback
  }
  const pageParam = POS(searchParams.get("page"), 1)
  const pageSizeParam = POS(searchParams.get("perPage"), DEFAULT_PAGE_SIZE)
  const searchParam = searchParams.get("username") || undefined
  const statusArray = (searchParams.get("status") || "")
    .split(",")
    .filter(Boolean)
  const statusParam = statusArray.length === 1 ? statusArray[0] : undefined
  const sortParam = searchParams.get("sort")

  const loadUsers = useCallback(async () => {
    setLoadError(null)
    if (hasLoadedRef.current) setRefreshing(true)
    else setLoading(true)
    try {
      const sortApi = sortParam
        ? (() => {
            try {
              const parsed = JSON.parse(sortParam) as Array<{
                id: string
                desc: boolean
              }>
              return sortToApiParams(parsed)
            } catch {
              return {}
            }
          })()
        : {}
      const result = await usersApi.listUsers({
        page: pageParam,
        perPage: pageSizeParam,
        q: searchParam,
        status: statusParam,
        sort: sortApi.sort,
        order: sortApi.order,
        tenantId: actorTenantId,
      })
      setUsers(result.items)
      setTotal(result.total)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
      setRefreshing(false)
    }
  }, [actorTenantId, pageParam, pageSizeParam, searchParam, statusParam, sortParam])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const loadRolesForTarget = useCallback(async (target: User | null) => {
    if (!target) {
      setAvailableRoles([])
      return
    }
    setRolesLoading(true)
    try {
      const result = await rolesApi.listRoles({
        page: 1,
        perPage: 100,
        tenantId: target.tenantId,
      })
      setAvailableRoles(result.items ?? [])
    } catch {
      setAvailableRoles([])
    } finally {
      setRolesLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRolesForTarget(roleTarget)
  }, [loadRolesForTarget, roleTarget])

  const loadSessionsForTarget = useCallback(async (target: User | null) => {
    if (!target) {
      setSessions([])
      return
    }
    setSessionsLoading(true)
    try {
      const result = await usersApi.listUserSessions(target.id, target.tenantId)
      setSessions(result.sessions ?? [])
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSessionsForTarget(sessionTarget)
  }, [loadSessionsForTarget, sessionTarget])

  const toggleRole = async (role: Role, assigned: boolean) => {
    if (!roleTarget) return
    setBusyRoleId(role.id)
    try {
      if (assigned) {
        await usersApi.unassignRole(
          roleTarget.id,
          role.id,
          roleTarget.tenantId
        )
      } else {
        await usersApi.assignRole(roleTarget.id, role.id, roleTarget.tenantId)
      }
      const nextRoles = assigned
        ? roleTarget.roles.filter((code) => code !== role.code)
        : [...roleTarget.roles, role.code]
      setRoleTarget({ ...roleTarget, roles: nextRoles })
      notify.success("Đã cập nhật vai trò")
    } catch (err) {
      notify.error("Không cập nhật được vai trò", translateApiError(err))
    } finally {
      setBusyRoleId(null)
    }
  }

  const handleCreate = async (values: CreateUserValues) => {
    try {
      await usersApi.createUser(values)
      notify.success(t("admin.users.create_success"))
      await loadUsers()
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
      await loadUsers()
    } catch (err) {
      notify.error(t("admin.users.update_failed"), translateApiError(err))
    }
  }

  const handleSetStatus = async (
    user: User,
    nextStatus: "ACTIVE" | "DISABLED"
  ) => {
    try {
      await usersApi.updateUser(user.id, user.tenantId, { status: nextStatus } as Record<
        string,
        unknown
      >)
      notify.success(
        nextStatus === "ACTIVE"
          ? t("admin.users.enable_success")
          : t("admin.users.disable_success")
      )
      await loadUsers()
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
      await loadUsers()
    } catch (err) {
      notify.error(t("admin.users.delete_failed"), translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget) return
    try {
      await usersApi.resetUserPassword(
        resetTarget.id,
        resetTarget.tenantId,
        identityPassword
      )
      notify.success(t("admin.users.identity.reset_success"))
      setResetTarget(null)
      setIdentityPassword("")
    } catch (err) {
      notify.error(
        t("admin.users.identity.reset_failed"),
        translateApiError(err)
      )
    }
  }

  const handleResetMFA = async () => {
    if (!mfaResetTarget) return
    try {
      await usersApi.resetUserMFA(mfaResetTarget.id, mfaResetTarget.tenantId)
      notify.success(t("admin.users.mfa.reset_success"))
      setMfaResetTarget(null)
    } catch (err) {
      notify.error(t("admin.users.mfa.reset_failed"), translateApiError(err))
    }
  }

  const handleProvisionIdentity = async () => {
    if (!provisionTarget) return
    try {
      const res = await usersApi.provisionUserIdentity(
        provisionTarget.id,
        provisionTarget.tenantId,
        identityPassword
      )
      notify.success(
        t("admin.users.identity.provision_success"),
        res.kratosIdentityId
      )
      setProvisionTarget(null)
      setIdentityPassword("")
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

  const revokeSessions = async () => {
    if (!sessionTarget) return
    try {
      await usersApi.revokeUserSessions(
        sessionTarget.id,
        sessionTarget.tenantId
      )
      notify.success(t("admin.users.sessions.revoke_success"))
      setSessionTarget(null)
    } catch (err) {
      notify.error(
        t("admin.users.sessions.revoke_failed"),
        translateApiError(err)
      )
    }
  }

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "username",
        accessorKey: "username",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.users.field.username")}
          />
        ),
        enableColumnFilter: true,
        cell: ({ row }) => {
          const user = row.original
          const displayName =
            user.name ||
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.nickname
          return (
            <div>
              <div className="font-medium text-foreground">
                {user.username || user.email || "-"}
              </div>
              {displayName ? (
                <div className="text-xs text-muted-foreground">
                  {displayName}
                </div>
              ) : null}
            </div>
          )
        },
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.email")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.original.email}</span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        enableColumnFilter: true,
        cell: ({ row }) => {
          const active = row.original.status === "ACTIVE"
          return (
            <Status variant={active ? "success" : "default"}>
              <StatusIndicator />
              <StatusLabel>
                {active
                  ? t("admin.users.status.active")
                  : t("admin.users.status.disabled")}
              </StatusLabel>
            </Status>
          )
        },
      },
      {
        id: "roles",
        header: () => t("admin.users.field.roles"),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((role) => (
              <Badge key={role} variant="outline" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.created")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.createdAt ? formatDate(row.original.createdAt) : "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right text-xs font-semibold text-foreground/80">
            {t("common.field.action")}
          </div>
        ),
        cell: ({ row }) => {
          const user = row.original
          const isActive = user.status === "ACTIVE"
          return (
            <div className="flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditTarget(user)}>
                    <Pencil className="mr-2 size-4" />
                    {t("common.action.edit")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleTarget(user)}>
                    <ShieldCheck className="mr-2 size-4" />
                    {t("admin.users.action.roles")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSessionTarget(user)}>
                    <MonitorCog className="mr-2 size-4" />
                    {t("admin.users.action.sessions")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setResetTarget(user)}>
                    <KeyRound className="mr-2 size-4" />
                    {t("admin.users.action.reset_password")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setMfaResetTarget(user)}>
                    <ShieldOff className="mr-2 size-4" />
                    {t("admin.users.action.reset_mfa")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setProvisionTarget(user)}>
                    <ShieldCheck className="mr-2 size-4" />
                    {t("admin.users.action.provision_identity")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() =>
                      handleSetStatus(user, isActive ? "DISABLED" : "ACTIVE")
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
                    onClick={() => setDeleteTarget(user)}
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t("common.action.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [formatDate, t]
  )

  const { table } = useDataTable({
    data: users,
    columns,
    pageCount: Math.ceil(total / pageSizeParam),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    },
  })

  const dialogs = (
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
        isBusy={busyUserId === editTarget?.id}
      />

      <UserRolesDialog
        user={roleTarget}
        open={roleTarget !== null}
        onOpenChange={(open) => !open && setRoleTarget(null)}
        availableRoles={availableRoles}
        rolesLoading={rolesLoading}
        busyRoleId={busyRoleId}
        onToggleRole={toggleRole}
      />

      <Dialog
        open={resetTarget !== null}
        onOpenChange={(open) => !open && setResetTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.users.action.reset_password")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("admin.users.identity.reset_description", {
                user: resetTarget?.username || resetTarget?.email || "",
              })}
            </p>
            <FormField label={t("admin.users.identity.new_password")}>
              <Input
                type="password"
                value={identityPassword}
                onChange={(e) => setIdentityPassword(e.target.value)}
              />
            </FormField>
            <Button
              className="w-full"
              onClick={handleResetPassword}
              disabled={!identityPassword || busyUserId === resetTarget?.id}
            >
              {t("admin.users.action.reset_password")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={provisionTarget !== null}
        onOpenChange={(open) => !open && setProvisionTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("admin.users.action.provision_identity")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("admin.users.identity.provision_description", {
                user: provisionTarget?.username || provisionTarget?.email || "",
              })}
            </p>
            <FormField label={t("admin.users.identity.temporary_password")}>
              <Input
                type="password"
                value={identityPassword}
                onChange={(e) => setIdentityPassword(e.target.value)}
              />
            </FormField>
            <Button
              className="w-full"
              onClick={handleProvisionIdentity}
              disabled={!identityPassword || busyUserId === provisionTarget?.id}
            >
              {t("admin.users.action.provision_identity")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={mfaResetTarget !== null}
        onOpenChange={(open) => !open && setMfaResetTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.users.mfa.reset_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.users.mfa.reset_description", {
                user: mfaResetTarget?.username || mfaResetTarget?.email || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetMFA}>
              {t("admin.users.action.reset_mfa")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserSessionsDialog
        user={sessionTarget}
        open={sessionTarget !== null}
        onOpenChange={(open) => !open && setSessionTarget(null)}
        sessions={sessions}
        sessionsLoading={sessionsLoading}
        onRevokeSessions={revokeSessions}
        isBusy={busyUserId === sessionTarget?.id}
      />

      <IdentityAuditDialog
        open={identityAuditOpen}
        onOpenChange={setIdentityAuditOpen}
        identityIssues={identityIssues}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common.confirm.delete_title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("common.confirm.delete_description", {
                item: deleteTarget?.username || deleteTarget?.email || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {t("common.action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

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
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadUsers}
      loadErrorTitle={t("admin.users.load_failed")}
      fetching={refreshing}
      table={table}
      batchActions={(tbl) => (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2.5 text-xs font-semibold border-emerald-600/30 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
            onClick={() => {
              const selectedCount = tbl.getSelectedRowModel().rows.length
              const filename = generateExportFilename("users", {
                scope: "selected",
                selectedCount,
              })
              exportTableToXlsx({
                table: tbl,
                scope: "selected",
                filename,
                sheetName: "Users",
              })
              notify.success(`Đã xuất ${selectedCount} người dùng đã chọn.`)
            }}
          >
            <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-600 dark:text-emerald-400" />
            Xuất Excel ({tbl.getSelectedRowModel().rows.length})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 px-2.5 text-xs font-medium"
            onClick={() => {
              const count = tbl.getSelectedRowModel().rows.length
              notify.info(`Đã kích hoạt xóa hàng loạt ${count} người dùng`)
            }}
          >
            <Trash2 className="mr-1.5 size-3.5" />
            Xóa đã chọn
          </Button>
        </>
      )}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("admin.users.create")}
        >
          <Button
            variant="outline"
            onClick={handleAuditIdentity}
            className="h-8 px-3 text-xs font-semibold"
          >
            <SearchCheck className="mr-2 size-3.5" />
            {t("admin.users.action.audit_identity")}
          </Button>
        </ListTableToolbar>
      }
      dialogs={dialogs}
    />
  )
}
