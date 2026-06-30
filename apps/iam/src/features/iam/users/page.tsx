import { useEffect, useState, useMemo } from "react"
import { FormField } from "@workspace/ui/components/form-field"
import { translateApiError, useI18n } from "@workspace/i18n"
import { adminApi } from "@/features/iam"
import type { User } from "@/features/iam"
import { notify } from "@workspace/notifications/notify"
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
import { useDataTable } from "@workspace/ui/hooks/use-data-table"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableToolbar } from "@workspace/ui/components/data-table/data-table-toolbar"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import type { ColumnDef } from "@tanstack/react-table"
import { Check, X, Trash2, KeyRound, ShieldCheck, MonitorCog, SearchCheck, Pencil, MoreHorizontal } from "lucide-react"
import type { AdminUserSession, IdentityConsistencyIssue } from "@/features/iam"

const DEFAULT_PAGE_SIZE = 10

export function UsersPage() {
  const { t, formatDate } = useI18n()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [busyUserID, setBusyUserID] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [provisionTarget, setProvisionTarget] = useState<User | null>(null)
  const [sessionTarget, setSessionTarget] = useState<User | null>(null)
  const [sessions, setSessions] = useState<AdminUserSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [identityIssues, setIdentityIssues] = useState<IdentityConsistencyIssue[] | null>(null)
  const [identityAuditOpen, setIdentityAuditOpen] = useState(false)
  const [form, setForm] = useState({
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
  })
  const [editForm, setEditForm] = useState({
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
  })
  const [identityPassword, setIdentityPassword] = useState("")

  const handleCreate = async () => {
    try {
      await adminApi.createUser(form)
      notify.success(t("admin.users.create_success"))
      setCreateOpen(false)
      setForm({
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
      })
      load()
    } catch (err) {
      notify.error(t("admin.users.create_failed"), translateApiError(err))
    }
  }

  const handleSetStatus = async (user: User, nextStatus: "ACTIVE" | "DISABLED") => {
    setBusyUserID(user.id)
    try {
      if (nextStatus === "ACTIVE") {
        await adminApi.enableUser(user.id)
        notify.success(t("admin.users.enable_success"))
      } else {
        await adminApi.disableUser(user.id)
        notify.success(t("admin.users.disable_success"))
      }
      load()
    } catch (err) {
      notify.error(t("admin.users.update_failed"), translateApiError(err))
    } finally {
      setBusyUserID(null)
    }
  }

  const handleDelete = async (user: User) => {
    setBusyUserID(user.id)
    try {
      await adminApi.deleteUser(user.id)
      notify.success(t("admin.users.delete_success"))
      setDeleteTarget(null)
      load()
    } catch (err) {
      notify.error(t("admin.users.delete_failed"), translateApiError(err))
    } finally {
      setBusyUserID(null)
    }
  }

  const openEdit = (user: User) => {
    setEditTarget(user)
    setEditForm({
      username: user.username || "",
      email: user.email || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      nickname: user.nickname || "",
      gender: user.gender || "",
      country: user.country || "",
      address: user.address || "",
      position: user.position || "",
      status: user.status || "ACTIVE",
      tenantId: user.tenantId || "default",
    })
  }

  const handleEdit = async () => {
    if (!editTarget) return
    setBusyUserID(editTarget.id)
    try {
      await adminApi.updateUser(editTarget.id, {
        username: editForm.username.trim(),
        email: editForm.email.trim(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        nickname: editForm.nickname.trim(),
        gender: editForm.gender.trim(),
        country: editForm.country.trim(),
        address: editForm.address.trim(),
        position: editForm.position.trim(),
        status: editForm.status,
        tenantId: editForm.tenantId.trim() || "default",
      })
      notify.success(t("admin.users.update_success"))
      setEditTarget(null)
      load()
    } catch (err) {
      notify.error(t("admin.users.update_failed"), translateApiError(err))
    } finally {
      setBusyUserID(null)
    }
  }

  const handleResetPassword = async () => {
    if (!resetTarget) return
    setBusyUserID(resetTarget.id)
    try {
      await adminApi.resetUserPassword(resetTarget.id, identityPassword)
      notify.success(t("admin.users.identity.reset_success"))
      setResetTarget(null)
      setIdentityPassword("")
    } catch (err) {
      notify.error(t("admin.users.identity.reset_failed"), translateApiError(err))
    } finally {
      setBusyUserID(null)
    }
  }

  const handleProvisionIdentity = async () => {
    if (!provisionTarget) return
    setBusyUserID(provisionTarget.id)
    try {
      const res = await adminApi.provisionUserIdentity(provisionTarget.id, identityPassword)
      notify.success(t("admin.users.identity.provision_success"), res.kratosIdentityId)
      setProvisionTarget(null)
      setIdentityPassword("")
      load()
    } catch (err) {
      notify.error(t("admin.users.identity.provision_failed"), translateApiError(err))
    } finally {
      setBusyUserID(null)
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

  const openSessions = async (user: User) => {
    setSessionTarget(user)
    setSessions([])
    setSessionsLoading(true)
    try {
      const res = await adminApi.listUserSessions(user.id)
      setSessions(res.sessions ?? [])
    } catch (err) {
      notify.error(t("admin.users.sessions.load_failed"), translateApiError(err))
    } finally {
      setSessionsLoading(false)
    }
  }

  const revokeSessions = async () => {
    if (!sessionTarget) return
    setBusyUserID(sessionTarget.id)
    try {
      const res = await adminApi.revokeUserSessions(sessionTarget.id)
      notify.success(t("admin.users.sessions.revoke_success"), `${res.count}`)
      await openSessions(sessionTarget)
    } catch (err) {
      notify.error(t("admin.users.sessions.revoke_failed"), translateApiError(err))
    } finally {
      setBusyUserID(null)
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
      header: t("admin.users.field.username"),
      enableColumnFilter: true,
      meta: {
        label: t("admin.users.field.username"),
        variant: "text",
        placeholder: t("admin.users.search"),
      }
    },
    {
      accessorKey: "email",
      header: t("common.field.email"),
    },
    {
      id: "status",
      accessorKey: "status",
      header: t("common.field.status"),
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
      header: t("admin.roles.title"),
      cell: ({ row }) => row.original.roles.join(", ") || "-",
    },
    {
      accessorKey: "createdAt",
      header: t("common.field.created"),
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
                  disabled={busyUserID === u.id}
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
  ], [t, formatDate, busyUserID])

  const totalPages = Math.ceil(total / DEFAULT_PAGE_SIZE) // estimated page count fallback

  // Dice UI useDataTable hook binds state to nuqs query state automatically
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

  // Read current query state from table state
  const tableState = table.getState()
  const pageIndex = tableState.pagination.pageIndex
  const pageSize = tableState.pagination.pageSize
  
  const searchVal = tableState.columnFilters.find((f) => f.id === "username")?.value as string | string[] | undefined
  const searchStr = Array.isArray(searchVal) ? searchVal.join(" ") : (searchVal ?? "")

  const statusFilter = tableState.columnFilters.find((f) => f.id === "status")?.value as string[] | string | undefined
  const statusParam = Array.isArray(statusFilter)
    ? (statusFilter.length === 1 ? statusFilter[0] : undefined)
    : statusFilter

  const sortField = tableState.sorting[0]?.id
  const sortOrder = tableState.sorting[0] ? (tableState.sorting[0].desc ? "DESC" : "ASC") : undefined

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.listUsers({
        page: pageIndex + 1, // API is 1-based page index
        size: pageSize,
        search: searchStr || undefined,
        status: statusParam || undefined,
        sortField,
        sortOrder,
      })
      setUsers(res.users)
      setTotal(res.total)
    } catch (err) {
      notify.error(t("admin.users.load_failed"), translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [pageIndex, pageSize, searchStr, statusParam, sortField, sortOrder])

  if (loading && users.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">{t("admin.users.title")}</h2>
        </div>
        <DataTableSkeleton columnCount={7} rowCount={10} filterCount={2} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Title & Count Badge */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-foreground">{t("admin.users.title")}</h2>
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("admin.users.count", { count: total })}
        </Badge>
      </div>

      {/* Dice UI DataTable Layout */}
      <DataTable table={table}>
        <DataTableToolbar table={table}>
          <Button
            variant="outline"
            onClick={handleAuditIdentity}
            className="h-8 px-3 text-xs font-semibold cursor-pointer"
          >
            <SearchCheck className="mr-2 size-3.5" />
            {t("admin.users.action.audit_identity")}
          </Button>
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-8 px-3 text-xs font-semibold cursor-pointer"
          >
            {t("admin.users.create")}
          </Button>
        </DataTableToolbar>
      </DataTable>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("admin.users.create")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <FormField label={t("admin.users.field.username")}>
              <Input value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
            </FormField>
            <FormField label={t("common.field.email")}>
              <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t("admin.users.field.first_name")}>
                <Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
              </FormField>
              <FormField label={t("admin.users.field.last_name")}>
                <Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
              </FormField>
            </div>
            <FormField label={t("admin.users.field.nickname")}>
              <Input value={form.nickname} onChange={(e) => setForm((p) => ({ ...p, nickname: e.target.value }))} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t("admin.users.field.gender")}>
                <Input value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))} />
              </FormField>
              <FormField label={t("admin.users.field.country")}>
                <Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
              </FormField>
            </div>
            <FormField label={t("admin.users.field.address")}>
              <Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
            </FormField>
            <FormField label={t("admin.users.field.position")}>
              <Input value={form.position} onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))} />
            </FormField>
            <FormField label={t("admin.users.field.tenant")}>
              <Input value={form.tenantId} onChange={(e) => setForm((p) => ({ ...p, tenantId: e.target.value }))} />
            </FormField>
            <FormField label={t("auth.login.field.password")}>
              <Input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button className="w-full" onClick={handleCreate}>
              {t("common.action.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("admin.users.edit")}</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <FormField label={t("admin.users.field.username")}>
              <Input value={editForm.username} onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))} />
            </FormField>
            <FormField label={t("common.field.email")}>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t("admin.users.field.first_name")}>
                <Input value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} />
              </FormField>
              <FormField label={t("admin.users.field.last_name")}>
                <Input value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} />
              </FormField>
            </div>
            <FormField label={t("admin.users.field.nickname")}>
              <Input value={editForm.nickname} onChange={(e) => setEditForm((p) => ({ ...p, nickname: e.target.value }))} />
            </FormField>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label={t("admin.users.field.gender")}>
                <Input value={editForm.gender} onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))} />
              </FormField>
              <FormField label={t("admin.users.field.country")}>
                <Input value={editForm.country} onChange={(e) => setEditForm((p) => ({ ...p, country: e.target.value }))} />
              </FormField>
            </div>
            <FormField label={t("admin.users.field.address")}>
              <Input value={editForm.address} onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))} />
            </FormField>
            <FormField label={t("admin.users.field.position")}>
              <Input value={editForm.position} onChange={(e) => setEditForm((p) => ({ ...p, position: e.target.value }))} />
            </FormField>
            <FormField label={t("common.field.status")}>
              <Input
                value={editForm.status}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value.toUpperCase() }))}
                placeholder="ACTIVE/DISABLED"
              />
            </FormField>
            <FormField label={t("admin.users.field.tenant")}>
              <Input value={editForm.tenantId} onChange={(e) => setEditForm((p) => ({ ...p, tenantId: e.target.value }))} />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button
              className="w-full"
              onClick={handleEdit}
              disabled={!editForm.username || !editForm.email || busyUserID === editTarget?.id}
            >
              {t("admin.users.action.save_changes")}
            </Button>
          </DialogFooter>
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
            <Button className="w-full" onClick={handleResetPassword} disabled={!identityPassword || busyUserID === resetTarget?.id}>
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
            <Button className="w-full" onClick={handleProvisionIdentity} disabled={!identityPassword || busyUserID === provisionTarget?.id}>
              {t("admin.users.action.provision_identity")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              <Button variant="outline" onClick={revokeSessions} disabled={!sessionTarget || busyUserID === sessionTarget?.id}>
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
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-700">
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
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {t("common.action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
