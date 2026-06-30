import { useEffect, useMemo, useState } from "react"
import { adminApi } from "@/features/iam"
import type { Role } from "@/features/iam"
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
import { Trash2 } from "lucide-react"

const DEFAULT_PAGE_SIZE = 10

export function RolesPage() {
  const { t } = useI18n()
  const [roles, setRoles] = useState<Role[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [form, setForm] = useState({ code: "", name: "" })

  const handleCreate = async () => {
    await adminApi.createRole(form)
    setOpen(false)
    setForm({ code: "", name: "" })
    setRefreshKey((key) => key + 1)
  }

  const handleDelete = async (id: string) => {
    await adminApi.deleteRole(id)
    setDeleteTarget(null)
    setRefreshKey((key) => key + 1)
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
    } catch {
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.roles.create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label={t("common.field.code")}>
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm((p) => ({ ...p, code: e.target.value }))
                }
              />
            </FormField>
            <FormField label={t("common.field.name")}>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </FormField>
            <Button className="w-full" onClick={handleCreate}>
              {t("common.action.create")}
            </Button>
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
