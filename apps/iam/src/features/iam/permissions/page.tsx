import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { adminApi } from "@/features/iam"
import type { Permission } from "@/features/iam"
import { notify } from "@workspace/notifications/notify"
import { translateApiError } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
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
import { Trash2 } from "lucide-react"

const DEFAULT_PAGE_SIZE = 10

const permissionFormSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(128, "Code is too long"),
  name: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
  module: z.string().trim().min(1, "Module is required").max(64, "Module is too long"),
  resource: z.string().trim().min(1, "Resource is required").max(64, "Resource is too long"),
  operation: z.string().trim().min(1, "Operation is required").max(64, "Operation is too long"),
})

type PermissionFormValues = z.infer<typeof permissionFormSchema>

const permissionDefaultValues: PermissionFormValues = {
  code: "",
  name: "",
  module: "",
  resource: "",
  operation: "",
}

export function PermissionsPage() {
  const { t } = useI18n()
  const [perms, setPerms] = useState<Permission[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Permission | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<PermissionFormValues>({
    resolver: zodResolver(permissionFormSchema),
    defaultValues: permissionDefaultValues,
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset(permissionDefaultValues)
  }

  const handleCreate = handleSubmit(async (values) => {
    try {
      await adminApi.createPermission(values)
      notify.success("Đã tạo quyền")
      setOpen(false)
      reset(permissionDefaultValues)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      notify.error("Không tạo được quyền", translateApiError(err))
    }
  })

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deletePermission(id)
      notify.success("Đã xóa quyền")
      setDeleteTarget(null)
      setRefreshKey((key) => key + 1)
    } catch (err) {
      notify.error("Không xóa được quyền", translateApiError(err))
    }
  }

  const columns = useMemo<ColumnDef<Permission>[]>(() => [
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
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.code}</span>,
    },
    {
      id: "module",
      accessorKey: "module",
      header: t("admin.field.module"),
      enableColumnFilter: true,
      meta: {
        label: t("admin.field.module"),
        variant: "text",
        placeholder: t("admin.field.module"),
      },
    },
    {
      accessorKey: "resource",
      header: t("common.field.resource"),
    },
    {
      accessorKey: "operation",
      header: t("common.field.operation"),
    },
    {
      id: "actions",
      header: () => <div className="text-right">{t("common.field.action")}</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
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

  const { table } = useDataTable<Permission>({
    columns,
    data: perms,
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
  const moduleVal = tableState.columnFilters.find((f) => f.id === "module")?.value as string | string[] | undefined
  const moduleStr = Array.isArray(moduleVal) ? moduleVal.join(" ") : (moduleVal ?? "")

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.listPermissions({
        page: pageIndex + 1,
        size: pageSize,
        module: moduleStr || undefined,
      })
      setPerms(res.permissions)
      setTotal(res.total)
    } catch (err) {
      notify.error("Không tải được danh sách quyền", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [pageIndex, pageSize, moduleStr, refreshKey])

  if (loading && perms.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="font-bold text-foreground text-lg">{t("admin.permissions.title")}</h2>
        </div>
        <DataTableSkeleton columnCount={6} rowCount={10} filterCount={1} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-bold text-foreground text-lg">{t("admin.permissions.title")}</h2>
        <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-[10px]">
          {t("admin.permissions.count", { count: total })}
        </Badge>
      </div>

      <DataTable table={table}>
        <DataTableToolbar table={table}>
          <Button
            onClick={() => setOpen(true)}
            className="h-8 px-3 font-semibold text-xs"
          >
            {t("admin.permissions.create")}
          </Button>
        </DataTableToolbar>
      </DataTable>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.permissions.create")}</DialogTitle>
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
            <FormField label={t("admin.field.module")} error={errors.module?.message}>
              <Input
                aria-invalid={Boolean(errors.module)}
                {...register("module")}
              />
            </FormField>
            <FormField label={t("common.field.resource")} error={errors.resource?.message}>
              <Input
                aria-invalid={Boolean(errors.resource)}
                {...register("resource")}
              />
            </FormField>
            <FormField label={t("common.field.operation")} error={errors.operation?.message}>
              <Input
                aria-invalid={Boolean(errors.operation)}
                {...register("operation")}
              />
            </FormField>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {t("common.action.create")}
            </Button>
          </form>
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
