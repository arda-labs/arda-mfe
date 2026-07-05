import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Permission, Role } from "@/features/iam"
import {
  useCreateRole,
  useDeleteRole,
  useRolePermissionOptions,
  useRoles,
  useSetRolePermission,
} from "@/features/iam/roles/queries"
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
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { useDataTable } from "@workspace/ui/hooks/use-data-table"
import { FormField } from "@workspace/ui/components/form-field"
import { useI18n } from "@workspace/i18n"
import type { ColumnDef } from "@tanstack/react-table"
import { ShieldCheck, Trash2 } from "lucide-react"
import { parseAsArrayOf, parseAsInteger, parseAsString, useQueryState } from "nuqs"
import { listQueryShellState, pageGateFromQueries } from "@workspace/core/query/list-query"

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
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: roleDefaultValues,
  })
  const createRole = useCreateRole()
  const deleteRole = useDeleteRole()
  const setRolePermission = useSetRolePermission()
  const rolePermissionOptions = useRolePermissionOptions(permissionTarget?.id)
  const permissions = rolePermissionOptions.data?.permissions ?? []
  const rolePermissions = rolePermissionOptions.data?.rolePermissions ?? []
  const permissionsLoading = rolePermissionOptions.isLoading
  const busyPermissionID = setRolePermission.isPending
    ? setRolePermission.variables?.permissionId
    : null

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset(roleDefaultValues)
  }

  const handleCreate = handleSubmit(async (values) => {
    try {
      await createRole.mutateAsync(values)
      notify.success("Đã tạo vai trò")
      setOpen(false)
      reset(roleDefaultValues)
    } catch (err) {
      notify.error("Không tạo được vai trò", translateApiError(err))
    }
  })

  const handleDelete = async (id: string) => {
    try {
      await deleteRole.mutateAsync(id)
      notify.success("Đã xóa vai trò")
      setDeleteTarget(null)
    } catch (err) {
      notify.error("Không xóa được vai trò", translateApiError(err))
    }
  }


  const openPermissions = (role: Role) => {
    setPermissionTarget(role)
  }

  const togglePermission = async (permission: Permission, assigned: boolean) => {
    if (!permissionTarget) return
    try {
      await setRolePermission.mutateAsync({
        roleId: permissionTarget.id,
        permissionId: permission.id,
        assigned,
      })
      notify.success("Đã cập nhật quyền")
    } catch (err) {
      notify.error("Không cập nhật được quyền", translateApiError(err))
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

  const [pageParam] = useQueryState("page", parseAsInteger.withDefault(1))
  const [pageSizeParam] = useQueryState("perPage", parseAsInteger.withDefault(DEFAULT_PAGE_SIZE))
  const [searchParam] = useQueryState("code", parseAsString)
  const [statusParam] = useQueryState(
    "status",
    parseAsArrayOf(parseAsString, ",").withDefault([])
  )
  const rolesQuery = useRoles({
    page: pageParam,
    perPage: pageSizeParam,
    q: searchParam || undefined,
    status: statusParam.length === 1 ? statusParam[0] : undefined,
  })
  const roles = rolesQuery.data?.items ?? []
  const total = rolesQuery.data?.total ?? 0
  const pageGate = pageGateFromQueries(rolesQuery)
  const { fetching } = listQueryShellState(rolesQuery)
  const totalPages = Math.max(1, Math.ceil(total / pageSizeParam))
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

  useEffect(() => {
    if (rolePermissionOptions.error) {
      notify.error("Không tải được danh sách quyền", translateApiError(rolePermissionOptions.error))
    }
  }, [rolePermissionOptions.error])

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
            <Button className="w-full" type="submit" disabled={isSubmitting || createRole.isPending}>
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
              disabled={deleteRole.isPending}
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
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {t("admin.roles.count", { count: total })}
        </Badge>
      }
      criticalPending={pageGate.criticalPending}
      criticalError={pageGate.criticalError}
      onRetry={pageGate.onRetry}
      fetching={fetching}
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
