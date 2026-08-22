import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Permission, Role } from "@/features/iam"
import { adminApi } from "@/features/iam"
import { notify } from "@workspace/notifications/notify"
import { translateApiError } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/ui/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/ui/admin-list/list-table-toolbar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@workspace/ui/components/alert-dialog"
import { useDataTable } from "@workspace/ui/hooks/use-data-table"
import { FormField } from "@workspace/ui/components/form-field"
import { useI18n } from "@workspace/i18n"
import type { ColumnDef } from "@tanstack/react-table"
import { listPageCount } from "@workspace/core/http/list-api"
import { useSearchParams } from "react-router-dom"
import { ShieldCheck, Trash2 } from "lucide-react"

const POS = (value: string | null, fallback: number) => {
  const n = Number.parseInt(value ?? "", 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const parseArrayParam = (raw: string | null) =>
  raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : []

const DEFAULT_PAGE_SIZE = 10

const roleFormSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(64, "Code is too long"),
  name: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
})

type RoleFormValues = z.infer<typeof roleFormSchema>

const roleDefaultValues: RoleFormValues = {
  code: "",
  name: "",
}

export function RolesPage() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [permissionTarget, setPermissionTarget] = useState<Role | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busyPermissionID, setBusyPermissionID] = useState<string | null>(null)

  // list state
  const [roles, setRoles] = useState<Role[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const hasLoadedRef = useRef(false)

  // permission options dialog state
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: roleDefaultValues,
  })

  const [searchParams] = useSearchParams()
  const pageParam = POS(searchParams.get("page"), 1)
  const pageSizeParam = POS(searchParams.get("perPage"), DEFAULT_PAGE_SIZE)
  const searchParam = searchParams.get("code")
  const statusParam = useMemo(
    () => parseArrayParam(searchParams.get("status")),
    [searchParams]
  )

  const loadRoles = useCallback(async () => {
    setLoadError(null)
    if (hasLoadedRef.current) setRefreshing(true)
    else setLoading(true)
    try {
      const result = await adminApi.listRoles({
        page: pageParam,
        perPage: pageSizeParam,
        q: searchParam || undefined,
        status: statusParam.length === 1 ? statusParam[0] : undefined,
      })
      setRoles(result.items)
      setTotal(result.total)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
      setRefreshing(false)
    }
  }, [pageParam, pageSizeParam, searchParam, statusParam])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  // Load permission options locally while a permission target is set
  useEffect(() => {
    if (!permissionTarget) {
      setAllPermissions([])
      setRolePermissions([])
      return
    }
    let cancelled = false
    setPermissionsLoading(true)
    void Promise.all([
      adminApi.listPermissions({ page: 1, perPage: 100 }),
      adminApi.listRolePermissions(permissionTarget.id),
    ])
      .then(([all, assigned]) => {
        if (cancelled) return
        setAllPermissions(all.items)
        setRolePermissions(assigned.permissions)
      })
      .catch((err) => {
        if (cancelled) return
        notify.error("Không tải được danh sách quyền", translateApiError(err))
      })
      .finally(() => {
        if (!cancelled) setPermissionsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [permissionTarget])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset(roleDefaultValues)
  }

  const handleCreate = handleSubmit(async (values) => {
    setCreating(true)
    try {
      await adminApi.createRole(values)
      notify.success("Đã tạo vai trò")
      setOpen(false)
      reset(roleDefaultValues)
      await loadRoles()
    } catch (err) {
      notify.error("Không tạo được vai trò", translateApiError(err))
    } finally {
      setCreating(false)
    }
  })

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await adminApi.deleteRole(id)
      notify.success("Đã xóa vai trò")
      setDeleteTarget(null)
      await loadRoles()
    } catch (err) {
      notify.error("Không xóa được vai trò", translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const togglePermission = async (permission: Permission, assigned: boolean) => {
    if (!permissionTarget) return
    setBusyPermissionID(permission.id)
    try {
      if (assigned) {
        await adminApi.unassignRolePermission(permissionTarget.id, permission.id)
        setRolePermissions((prev) => prev.filter((item) => item.id !== permission.id))
      } else {
        await adminApi.assignRolePermission(permissionTarget.id, permission.id)
        setRolePermissions((prev) => [...prev, permission])
      }
      notify.success("Đã cập nhật quyền")
    } catch (err) {
      notify.error("Không cập nhật được quyền", translateApiError(err))
    } finally {
      setBusyPermissionID(null)
    }
  }

  const columns = useMemo<ColumnDef<Role>[]>(() => [
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
      id: "code",
      accessorKey: "code",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label={t("common.field.code")} />
      ),
      enableColumnFilter: true,
      meta: {
        label: t("common.field.code"),
        variant: "text",
        placeholder: t("common.field.code"),
      },
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label={t("common.field.name")} />
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
        ],
      },
      cell: ({ row }) => (
        <Status variant={row.original.status === "ACTIVE" ? "success" : "default"}>
          <StatusIndicator />
          <StatusLabel>{row.original.status || "-"}</StatusLabel>
        </Status>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("common.field.action")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={() => setPermissionTarget(row.original)}
            title="Phân quyền"
          >
            <ShieldCheck className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
            onClick={() => setDeleteTarget(row.original)}
            title={t("common.action.delete")}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], [t])

  const totalPages = Math.max(1, listPageCount(total, pageSizeParam))

  const permissionsByModule = useMemo(() => {
    const groups = new Map<string, Permission[]>()
    for (const permission of allPermissions) {
      const key = permission.module || "other"
      groups.set(key, [...(groups.get(key) ?? []), permission])
    }
    return Array.from(groups.entries())
  }, [allPermissions])

  const { table } = useDataTable<Role>({
    columns,
    data: roles,
    pageCount: totalPages,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    },
  })

  const dialogs = (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.roles.create")}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={handleCreate}>
            <FormField label={t("common.field.code")} error={errors.code?.message}>
              <Input
                aria-invalid={Boolean(errors.code)}
                {...register("code")}
              />
            </FormField>
            <FormField label={t("common.field.name")} error={errors.name?.message}>
              <Input
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </FormField>
            <Button className="w-full" type="submit" disabled={isSubmitting || creating}>
              {t("common.action.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionTarget !== null} onOpenChange={(nextOpen) => !nextOpen && setPermissionTarget(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Phân quyền cho {permissionTarget?.name || permissionTarget?.code || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-4 overflow-auto pr-1">
            {permissionsLoading ? (
              <div className="text-sm text-muted-foreground">Đang tải quyền...</div>
            ) : allPermissions.length === 0 ? (
              <div className="text-sm text-muted-foreground">Chưa có quyền để gán.</div>
            ) : (
              permissionsByModule.map(([module, items]) => (
                <section key={module} className="space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    {module}
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {items.map((permission) => {
                      const assigned = rolePermissions.some((item) => item.id === permission.id)
                      return (
                        <label
                          key={permission.id}
                          className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={assigned}
                            disabled={busyPermissionID === permission.id}
                            onCheckedChange={() => togglePermission(permission, assigned)}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium">{permission.name}</span>
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

      <AlertDialog open={deleteTarget !== null} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <DialogTitle>{t("common.confirm.delete_title")}</DialogTitle>
            <AlertDialogDescription>
              {t("common.confirm.delete_description", {
                item: deleteTarget?.code || deleteTarget?.name || "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
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
      title={t("admin.roles.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("admin.roles.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadRoles}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setOpen(true)}
          createLabel={t("admin.roles.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
