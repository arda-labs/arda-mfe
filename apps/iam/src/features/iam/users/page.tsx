import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useSearchParams } from "react-router-dom"
import { z } from "zod"
import { FormField } from "@workspace/ui/components/form-field"
import { sortToApiParams } from "@workspace/api/list"
import { translateApiError, useI18n } from "@workspace/i18n"
import { adminApi } from "@/features/iam"
import type { AdminUserSession, Role, User } from "@/features/iam"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
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
import { Input } from "@workspace/ui/components/input"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { useDataTable } from "@workspace/admin-list/use-data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import type { ColumnDef } from "@tanstack/react-table"
import { Check, X, Trash2, KeyRound, ShieldCheck, ShieldOff, MonitorCog, SearchCheck, Pencil, MoreHorizontal } from "lucide-react"
import type { IdentityConsistencyIssue } from "@/features/iam"

const DEFAULT_PAGE_SIZE = 10

const createUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(64, "Username is too long"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().trim().max(100, "First name is too long").optional(),
  lastName: z.string().trim().max(100, "Last name is too long").optional(),
  nickname: z.string().trim().max(100, "Nickname is too long").optional(),
  gender: z.string().trim().max(32, "Gender is too long").optional(),
  country: z.string().trim().max(64, "Country is too long").optional(),
  address: z.string().trim().max(255, "Address is too long").optional(),
  position: z.string().trim().max(128, "Position is too long").optional(),
  tenantId: z.string().trim().min(1, "Tenant is required"),
})

type CreateUserValues = z.infer<typeof createUserSchema>

const editUserSchema = z.object({
  username: z.string().trim().min(1, "Username is required").max(64, "Username is too long"),
  email: z.string().trim().email("Enter a valid email"),
  firstName: z.string().trim().max(100, "First name is too long").optional(),
  lastName: z.string().trim().max(100, "Last name is too long").optional(),
  nickname: z.string().trim().max(100, "Nickname is too long").optional(),
  gender: z.string().trim().max(32, "Gender is too long").optional(),
  country: z.string().trim().max(64, "Country is too long").optional(),
  address: z.string().trim().max(255, "Address is too long").optional(),
  position: z.string().trim().max(128, "Position is too long").optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  tenantId: z.string().trim().min(1, "Tenant is required"),
})

type EditUserValues = z.infer<typeof editUserSchema>

const createUserDefaultValues: CreateUserValues = {
  username: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  nickname: "",
  gender: "",
  country: "",
  address: "",
  position: "",
  tenantId: "default",
}

const editUserDefaultValues: EditUserValues = {
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  nickname: "",
  gender: "",
  country: "",
  address: "",
  position: "",
  status: "ACTIVE",
  tenantId: "default",
}

function toEditUserValues(user: User): EditUserValues {
  return {
    username: user.username || "",
    email: user.email || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    nickname: user.nickname || "",
    gender: user.gender || "",
    country: user.country || "",
    address: user.address || "",
    position: user.position || "",
    status: user.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    tenantId: user.tenantId || "default",
  }
}

export function UsersPage() {
  const { t, formatDate } = useI18n()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [mfaResetTarget, setMfaResetTarget] = useState<User | null>(null)
  const [provisionTarget, setProvisionTarget] = useState<User | null>(null)
  const [roleTarget, setRoleTarget] = useState<User | null>(null)
  const [sessionTarget, setSessionTarget] = useState<User | null>(null)
  const [identityIssues, setIdentityIssues] = useState<IdentityConsistencyIssue[] | null>(null)
  const [identityAuditOpen, setIdentityAuditOpen] = useState(false)
  const {
    formState: { errors: createErrors, isSubmitting: isCreating },
    handleSubmit: handleCreateSubmit,
    register: registerCreate,
    reset: resetCreateForm,
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: createUserDefaultValues,
  })
  const {
    formState: { errors: editErrors, isSubmitting: isUpdatingUser },
    handleSubmit: handleEditSubmit,
    register: registerEdit,
    reset: resetEditForm,
  } = useForm<EditUserValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: editUserDefaultValues,
  })
  const [identityPassword, setIdentityPassword] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const hasLoadedRef = useRef(false)
  const [busyUserId] = useState<string | null>(null)
  const [busyRoleId, setBusyRoleId] = useState<string | null>(null)

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
  const statusArray = (searchParams.get("status") || "").split(",").filter(Boolean)
  const statusParam = statusArray.length === 1 ? statusArray[0] : undefined
  const sortParam = searchParams.get("sort")

  const loadUsers = useCallback(async () => {
    setLoadError(null)
    if (hasLoadedRef.current) setRefreshing(true)
    else setLoading(true)
    try {
      const sortApi = sortParam ? (() => {
        try {
          const parsed = JSON.parse(sortParam) as Array<{ id: string; desc: boolean }>
          return sortToApiParams(parsed)
        } catch { return {} }
      })() : {}
      const result = await adminApi.listUsers({
        page: pageParam,
        perPage: pageSizeParam,
        q: searchParam,
        status: statusParam,
        sort: sortApi.sort,
        order: sortApi.order,
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
  }, [pageParam, pageSizeParam, searchParam, statusParam, sortParam])

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
      const result = await adminApi.listRoles({ page: 1, perPage: 100 })
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
      const result = await adminApi.listUserSessions(target.id)
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

  const openRoles = (user: User) => {
    setRoleTarget(user)
  }

  const toggleRole = async (role: Role, assigned: boolean) => {
    if (!roleTarget) return
    setBusyRoleId(role.id)
    try {
      if (assigned) {
        await adminApi.unassignRole(roleTarget.id, role.id)
      } else {
        await adminApi.assignRole(roleTarget.id, role.id)
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

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open)
    if (!open) resetCreateForm(createUserDefaultValues)
  }

  const handleCreate = handleCreateSubmit(async (values) => {
    try {
      await adminApi.createUser(values)
      notify.success(t("admin.users.create_success"))
      setCreateOpen(false)
      resetCreateForm(createUserDefaultValues)
    } catch (err) {
      notify.error(t("admin.users.create_failed"), translateApiError(err))
    }
  })

  const handleSetStatus = async (user: User, nextStatus: "ACTIVE" | "DISABLED") => {
    try {
      await adminApi.updateUser(user.id, { status: nextStatus } as Record<string, unknown>)
      notify.success(
        nextStatus === "ACTIVE"
          ? t("admin.users.enable_success")
          : t("admin.users.disable_success")
      )
    } catch (err) {
      notify.error(t("admin.users.update_failed"), translateApiError(err))
    }
  }

  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (user: User) => {
    setDeleting(true)
    try {
      await adminApi.deleteUser(user.id)
      notify.success(t("admin.users.delete_success"))
      setDeleteTarget(null)
    } catch (err) {
      notify.error(t("admin.users.delete_failed"), translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = (user: User) => {
    setEditTarget(user)
    resetEditForm(toEditUserValues(user))
  }

  const handleEdit = handleEditSubmit(async (values) => {
    if (!editTarget) return
    try {
      await adminApi.updateUser(editTarget.id, {
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
        tenantId: values.tenantId.trim() || "default",
      })
      notify.success(t("admin.users.update_success"))
      setEditTarget(null)
      resetEditForm(editUserDefaultValues)
    } catch (err) {
      notify.error(t("admin.users.update_failed"), translateApiError(err))
    }
  })

  const handleResetPassword = async () => {
    if (!resetTarget) return
    try {
      await adminApi.resetUserPassword(resetTarget.id, identityPassword)
      notify.success(t("admin.users.identity.reset_success"))
      setResetTarget(null)
      setIdentityPassword("")
    } catch (err) {
      notify.error(t("admin.users.identity.reset_failed"), translateApiError(err))
    }
  }

  const handleResetMFA = async () => {
    if (!mfaResetTarget) return
    try {
      await adminApi.resetUserMFA(mfaResetTarget.id)
      notify.success(t("admin.users.mfa.reset_success"))
      setMfaResetTarget(null)
    } catch (err) {
      notify.error(t("admin.users.mfa.reset_failed"), translateApiError(err))
    }
  }

  const handleProvisionIdentity = async () => {
    if (!provisionTarget) return
    try {
      const res = await adminApi.provisionUserIdentity(provisionTarget.id, identityPassword)
      notify.success(t("admin.users.identity.provision_success"), res.kratosIdentityId)
      setProvisionTarget(null)
      setIdentityPassword("")
    } catch (err) {
      notify.error(t("admin.users.identity.provision_failed"), translateApiError(err))
    }
  }

  const handleAuditIdentity = async () => {
    try {
      const res = await adminApi.auditIdentityConsistency()
      setIdentityIssues(res.issues ?? [])
      setIdentityAuditOpen(true)
      if (res.ok) {
        notify.success(t("admin.users.identity.audit_ok"))
      } else {
        notify.warning(t("admin.users.identity.audit_issues"), `${res.count}`)
      }
    } catch (err) {
      notify.error(t("admin.users.identity.audit_failed"), translateApiError(err))
    }
  }

  const openSessions = (user: User) => {
    setSessionTarget(user)
  }

  const revokeSessions = async () => {
    if (!sessionTarget) return
    try {
      const res = await adminApi.revokeUserSessions(sessionTarget.id)
      notify.success(t("admin.users.sessions.revoke_success"), `${res.count}`)
    } catch (err) {
      notify.error(t("admin.users.sessions.revoke_failed"), translateApiError(err))
    }
  }

  // Reusable Columns with Dice UI filter meta
  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t("common.action.select_all")}
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t("common.action.select_row")}
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "username",
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label={t("admin.users.field.username")} />
      ),
      enableColumnFilter: true,
      meta: {
        label: t("admin.users.field.username"),
        variant: "text",
        placeholder: t("admin.users.search"),
      }
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label={t("common.field.email")} />
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label={t("common.field.status")} />
      ),
      enableColumnFilter: true,
      meta: {
        label: t("common.field.status"),
        variant: "multiSelect",
        options: [
          { label: t("admin.users.status.active"), value: "ACTIVE" },
          { label: t("admin.users.status.disabled"), value: "DISABLED" },
        ]
      },
      cell: ({ row }) => {
        const u = row.original
        return (
          <Status variant={u.status === "ACTIVE" ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>{u.status}</StatusLabel>
          </Status>
        )
      }
    },
    {
      accessorKey: "roles",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label={t("admin.roles.title")} />
      ),
      cell: ({ row }) => row.original.roles.join(", ") || "-",
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label={t("common.field.created")} />
      ),
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("common.field.action")}</div>,
      cell: ({ row }) => {
        const u = row.original
        const hasKratosIdentity = Boolean(u.kratosIdentityId)
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-foreground"
                  disabled={busyUserId === u.id}
                >
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">{t("admin.users.action.open_actions")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => openEdit(u)}>
                  <Pencil className="mr-2 size-4" />
                  {t("admin.users.action.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openRoles(u)}>
                  <ShieldCheck className="mr-2 size-4" />
                  Phân vai trò
                </DropdownMenuItem>
                {u.status === "ACTIVE" ? (
                  <DropdownMenuItem onClick={() => handleSetStatus(u, "DISABLED")}>
                    <X className="mr-2 size-4" />
                    {t("common.action.disable")}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleSetStatus(u, "ACTIVE")}>
                    <Check className="mr-2 size-4" />
                    {t("common.action.enable")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={!hasKratosIdentity}
                  onClick={() => {
                    setResetTarget(u)
                    setIdentityPassword("")
                  }}
                >
                  <KeyRound className="mr-2 size-4" />
                  {t("admin.users.action.reset_password")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMfaResetTarget(u)}>
                  <ShieldOff className="mr-2 size-4" />
                  {t("admin.users.action.reset_mfa")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={hasKratosIdentity}
                  onClick={() => {
                    setProvisionTarget(u)
                    setIdentityPassword("")
                  }}
                >
                  <ShieldCheck className="mr-2 size-4" />
                  {t("admin.users.action.provision_identity")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSessions(u)}>
                  <MonitorCog className="mr-2 size-4" />
                  {t("admin.users.action.manage_sessions")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteTarget(u)}
                >
                  <Trash2 className="mr-2 size-4" />
                  {t("common.action.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
    }
  ], [t, formatDate, busyUserId])

  const totalPages = Math.max(1, Math.ceil(total / pageSizeParam))

  const { table } = useDataTable<User>({
    columns,
    data: users,
    pageCount: totalPages,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: DEFAULT_PAGE_SIZE,
      }
    }
  })

  const dialogs = (
    <>
      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent className="overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("admin.users.create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
          <DialogBody className="space-y-3">
            <FormField label={t("admin.users.field.username")} error={createErrors.username?.message}>
              <Input aria-invalid={Boolean(createErrors.username)} {...registerCreate("username")} />
            </FormField>
            <FormField label={t("common.field.email")} error={createErrors.email?.message}>
              <Input type="email" aria-invalid={Boolean(createErrors.email)} {...registerCreate("email")} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t("admin.users.field.first_name")} error={createErrors.firstName?.message}>
                <Input aria-invalid={Boolean(createErrors.firstName)} {...registerCreate("firstName")} />
              </FormField>
              <FormField label={t("admin.users.field.last_name")} error={createErrors.lastName?.message}>
                <Input aria-invalid={Boolean(createErrors.lastName)} {...registerCreate("lastName")} />
              </FormField>
            </div>
            <FormField label={t("admin.users.field.nickname")} error={createErrors.nickname?.message}>
              <Input aria-invalid={Boolean(createErrors.nickname)} {...registerCreate("nickname")} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t("admin.users.field.gender")} error={createErrors.gender?.message}>
                <Input aria-invalid={Boolean(createErrors.gender)} {...registerCreate("gender")} />
              </FormField>
              <FormField label={t("admin.users.field.country")} error={createErrors.country?.message}>
                <Input aria-invalid={Boolean(createErrors.country)} {...registerCreate("country")} />
              </FormField>
            </div>
            <FormField label={t("admin.users.field.address")} error={createErrors.address?.message}>
              <Input aria-invalid={Boolean(createErrors.address)} {...registerCreate("address")} />
            </FormField>
            <FormField label={t("admin.users.field.position")} error={createErrors.position?.message}>
              <Input aria-invalid={Boolean(createErrors.position)} {...registerCreate("position")} />
            </FormField>
            <FormField label={t("admin.users.field.tenant")} error={createErrors.tenantId?.message}>
              <Input aria-invalid={Boolean(createErrors.tenantId)} {...registerCreate("tenantId")} />
            </FormField>
            <FormField label={t("auth.login.field.password")} error={createErrors.password?.message}>
              <Input type="password" aria-invalid={Boolean(createErrors.password)} {...registerCreate("password")} />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button className="w-full" type="submit" disabled={isCreating}>
              {t("common.action.create")}
            </Button>
          </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null)
            resetEditForm(editUserDefaultValues)
          }
        }}
      >
        <DialogContent className="overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("admin.users.edit")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <DialogBody className="space-y-3">
              <FormField label={t("admin.users.field.username")} error={editErrors.username?.message}>
                <Input aria-invalid={Boolean(editErrors.username)} {...registerEdit("username")} />
              </FormField>
              <FormField label={t("common.field.email")} error={editErrors.email?.message}>
                <Input type="email" aria-invalid={Boolean(editErrors.email)} {...registerEdit("email")} />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label={t("admin.users.field.first_name")} error={editErrors.firstName?.message}>
                  <Input aria-invalid={Boolean(editErrors.firstName)} {...registerEdit("firstName")} />
                </FormField>
                <FormField label={t("admin.users.field.last_name")} error={editErrors.lastName?.message}>
                  <Input aria-invalid={Boolean(editErrors.lastName)} {...registerEdit("lastName")} />
                </FormField>
              </div>
              <FormField label={t("admin.users.field.nickname")} error={editErrors.nickname?.message}>
                <Input aria-invalid={Boolean(editErrors.nickname)} {...registerEdit("nickname")} />
              </FormField>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label={t("admin.users.field.gender")} error={editErrors.gender?.message}>
                  <Input aria-invalid={Boolean(editErrors.gender)} {...registerEdit("gender")} />
                </FormField>
                <FormField label={t("admin.users.field.country")} error={editErrors.country?.message}>
                  <Input aria-invalid={Boolean(editErrors.country)} {...registerEdit("country")} />
                </FormField>
              </div>
              <FormField label={t("admin.users.field.address")} error={editErrors.address?.message}>
                <Input aria-invalid={Boolean(editErrors.address)} {...registerEdit("address")} />
              </FormField>
              <FormField label={t("admin.users.field.position")} error={editErrors.position?.message}>
                <Input aria-invalid={Boolean(editErrors.position)} {...registerEdit("position")} />
              </FormField>
              <FormField label={t("common.field.status")} error={editErrors.status?.message}>
                <Input
                  aria-invalid={Boolean(editErrors.status)}
                  placeholder="ACTIVE/DISABLED"
                  {...registerEdit("status", {
                    onChange: (event) => {
                      event.target.value = event.target.value.toUpperCase()
                    },
                  })}
                />
              </FormField>
              <FormField label={t("admin.users.field.tenant")} error={editErrors.tenantId?.message}>
                <Input aria-invalid={Boolean(editErrors.tenantId)} {...registerEdit("tenantId")} />
              </FormField>
            </DialogBody>
            <DialogFooter>
              <Button className="w-full" type="submit" disabled={isUpdatingUser || busyUserId === editTarget?.id}>
                {t("admin.users.action.save_changes")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={roleTarget !== null} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Phân vai trò cho {roleTarget?.username || roleTarget?.email || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {rolesLoading ? (
              <div className="text-sm text-muted-foreground">Đang tải vai trò...</div>
            ) : availableRoles.length === 0 ? (
              <div className="text-sm text-muted-foreground">Chưa có vai trò để gán.</div>
            ) : (
              availableRoles.map((role) => {
                const assigned = Boolean(roleTarget?.roles.includes(role.code))
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

      <Dialog open={resetTarget !== null} onOpenChange={(open) => !open && setResetTarget(null)}>
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
            <Button className="w-full" onClick={handleResetPassword} disabled={!identityPassword || busyUserId === resetTarget?.id}>
              {t("admin.users.action.reset_password")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={provisionTarget !== null} onOpenChange={(open) => !open && setProvisionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.users.action.provision_identity")}</DialogTitle>
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
            <Button className="w-full" onClick={handleProvisionIdentity} disabled={!identityPassword || busyUserId === provisionTarget?.id}>
              {t("admin.users.action.provision_identity")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={mfaResetTarget !== null} onOpenChange={(open) => !open && setMfaResetTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.users.mfa.reset_title")}</AlertDialogTitle>
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

      <Dialog open={sessionTarget !== null} onOpenChange={(open) => !open && setSessionTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {t("admin.users.sessions.title", {
                user: sessionTarget?.username || sessionTarget?.email || "",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" onClick={revokeSessions} disabled={!sessionTarget || busyUserId === sessionTarget?.id}>
                {t("admin.users.action.revoke_sessions")}
              </Button>
            </div>
            {sessionsLoading ? (
              <div className="text-sm text-muted-foreground">{t("admin.users.sessions.loading")}</div>
            ) : sessions.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("admin.users.sessions.empty")}</div>
            ) : (
              <div className="max-h-96 space-y-2 overflow-auto">
                {sessions.map((session) => (
                  <div key={session.id} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{session.deviceName || session.deviceId || session.id}</div>
                    <div className="text-xs text-muted-foreground">
                      {[session.browser, session.os, session.ipAddress, session.status].filter(Boolean).join(" · ") || "-"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t("admin.users.sessions.last_seen")}: {session.lastSeenAt ? formatDate(session.lastSeenAt) : "-"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={identityAuditOpen} onOpenChange={setIdentityAuditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("admin.users.identity.audit_title")}</DialogTitle>
          </DialogHeader>
          {identityIssues?.length === 0 ? (
            <div className="rounded-lg border border-success/20 bg-success/10 p-3 text-sm text-success">
              {t("admin.users.identity.audit_empty")}
            </div>
          ) : (
            <div className="max-h-96 space-y-2 overflow-auto">
              {(identityIssues ?? []).map((issue, index) => (
                <div key={`${issue.type}-${issue.userId || issue.kratosIdentityId || index}`} className="rounded-lg border p-3 text-sm">
                  <div className="font-medium">{issue.type}</div>
                  <div className="text-xs text-muted-foreground">
                    {[issue.username, issue.email, issue.userId, issue.kratosIdentityId, issue.mappingIdentityId]
                      .filter(Boolean)
                      .join(" · ") || `count: ${issue.count ?? 0}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirm.delete_title")}</AlertDialogTitle>
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
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("admin.users.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadUsers}
      loadErrorTitle={t("admin.users.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setCreateOpen(true)}
          createLabel={t("admin.users.create")}
        >
          <Button
            variant="outline"
            onClick={handleAuditIdentity}
            disabled={false}
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
