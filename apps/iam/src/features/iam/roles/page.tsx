import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { adminApi } from "@/features/iam"
import type { Permission, Role } from "@/features/iam"
import { notify } from "@workspace/notifications/notify"
import { translateApiError } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { DataTableToolbar } from "@workspace/ui/components/data-table/data-table-toolbar"
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
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { useDataTable } from "@workspace/ui/hooks/use-data-table"
import { FormField } from "@workspace/ui/components/form-field"
import { useI18n } from "@workspace/i18n"
import type { ColumnDef } from "@tanstack/react-table"
import { ShieldCheck, Trash2 } from "lucide-react"

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
  const [roles, setRoles] = useState<Role[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [permissionTarget, setPermissionTarget] = useState<Role | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [busyPermissionID, setBusyPermissionID] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: roleDefaultValues,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset(roleDefaultValues)
  }

  const handleCreate = handleSubmit(async (values) => {
    try {
      await adminApi.createRole(values)
      notify.success("Đã tạo vai trò")
      setOpen(false)
      reset(roleDefaultValues)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      notify.error("Không tạo được vai trò", translateApiError(err))
    }
  })

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteRole(id)
      notify.success("Đã xóa vai trò")
      setDeleteTarget(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      notify.error("Không xóa được vai trò", translateApiError(err))
    }
  }


  const openPermissions = async (role: Role) => {
    setPermissionTarget(role)
    setPermissionsLoading(true)
    try {
      const [all, assigned] = await Promise.all([
        adminApi.listPermissions({ page: 1, size: 100 }),
        adminApi.listRolePermissions(role.id),
      ])
      setPermissions(all.permissions)
      setRolePermissions(assigned.permissions)
    } catch (err) {
      notify.error("Không tải được danh sách quyền", translateApiError(err))
    } finally {
      setPermissionsLoading(false)
    }
  }

  const togglePermission = async (permission: Permission, assigned: boolean) => {
    if (!permissionTarget) return
    setBusyPermissionID(permission.id)
    try {
      if (assigned) {
        await adminApi.unassignRolePermission(permissionTarget.id, permission.id)
        setRolePermissions((current) => current.filter((item) => item.id !== permission.id))
      } else {
        await adminApi.assignRolePermission(permissionTarget.id, permission.id)
        setRolePermissions((current) => [...current, permission])
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
      header: t("common.field.code"),
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
      header: t("common.field.name"),
    },
    {
      id: "status",
      accessorKey: "status",
      header: t("common.field.status"),
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
            onClick={() => openPermissions(row.original)}
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

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))
  const permissionsByModule = useMemo(() => {
    const groups = new Map<string, Permission[]>()
    for (const permission of permissions) {
      const key = permission.module || "other"
      groups.set(key, [...(groups.get(key) ?? []), permission])
    }
    return Array.from(groups.entries())
  }, [permissions])

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

  const tableState = table.getState()
  const pageIndex = tableState.pagination.pageIndex
  const pageSize = tableState.pagination.pageSize
  const searchVal = tableState.columnFilters.find((f) => f.id === "code")?.value as string | string[] | undefined
  const searchStr = Array.isArray(searchVal) ? searchVal.join(" ") : (searchVal ?? "")

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.listRoles({
        page: pageIndex + 1,
        size: pageSize,
        search: searchStr || undefined,
      })
      setRoles(res.roles)
      setTotal(res.total)
    } catch (err) {
      notify.error("Không tải được danh sách vai trò", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [pageIndex, pageSize, searchStr, refreshKey])

  if (loading && roles.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-foreground text-lg">{t("admin.roles.title")}</h2>
        </div>
        <DataTableSkeleton columnCount={5} rowCount={10} filterCount={1} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-bold text-foreground text-lg">{t("admin.roles.title")}</h2>
        <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-[10px]">
          {t("admin.roles.count", { count: total })}
        </Badge>
      </div>

      <DataTable table={table}>
        <DataTableToolbar table={table}>
          <Button
            onClick={() => setOpen(true)}
            className="h-8 px-3 font-semibold text-xs"
          >
            {t("admin.roles.create")}
          </Button>
        </DataTableToolbar>
      </DataTable>

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
            <Button className="w-full" type="submit" disabled={isSubmitting}>
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
            ) : permissions.length === 0 ? (
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
            <AlertDialogTitle>{t("common.confirm.delete_title")}</AlertDialogTitle>
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
              onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
            >
              {t("common.action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
