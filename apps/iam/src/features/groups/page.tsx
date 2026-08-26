import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import type { Group } from "./types"
import { groupsApi } from "./api"
import { GroupMembersDialog } from "./group-members-dialog"
import { GroupRolesDialog } from "./group-roles-dialog"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
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
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Textarea } from "@workspace/ui/components/textarea"
import { useDataTable } from "@workspace/admin-list/use-data-table"
import { useSearchParams } from "react-router-dom"
import { useAuthStore } from "@workspace/auth/store"

const POS = (value: string | null, fallback: number) => {
  const n = Number.parseInt(value ?? "", 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

const parseArrayParam = (raw: string | null) =>
  raw
    ? raw
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : []
import { Pencil, ShieldCheck, Trash2, Users } from "lucide-react"

const DEFAULT_PAGE_SIZE = 10

const groupSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(128, "Code is too long"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name is too long"),
  description: z
    .string()
    .trim()
    .max(1000, "Description is too long")
    .optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  tenantId: z.string().trim().min(1, "Tenant is required"),
})

type GroupFormValues = z.infer<typeof groupSchema>

const groupDefaultValues: GroupFormValues = {
  code: "",
  name: "",
  description: "",
  status: "ACTIVE",
  tenantId: "",
}

function toGroupValues(group: Group): GroupFormValues {
  return {
    code: group.code,
    name: group.name,
    description: group.description ?? "",
    status: group.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    tenantId: group.tenantId || "",
  }
}

export function GroupsPage() {
  const { t, formatDate } = useI18n()
  const actorTenantId = useAuthStore((state) => state.user?.tenantId ?? "")
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Group | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)
  const [memberTarget, setMemberTarget] = useState<Group | null>(null)
  const [roleTarget, setRoleTarget] = useState<Group | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: groupDefaultValues,
  })

  // list state
  const [groups, setGroups] = useState<Group[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const hasLoadedRef = useRef(false)

  const [searchParams] = useSearchParams()
  const pageParam = POS(searchParams.get("page"), 1)
  const pageSizeParam = POS(searchParams.get("perPage"), DEFAULT_PAGE_SIZE)
  const searchParam = searchParams.get("code")
  const statusParam = useMemo(
    () => parseArrayParam(searchParams.get("status")),
    [searchParams]
  )

  const loadGroups = useCallback(async () => {
    setLoadError(null)
    if (hasLoadedRef.current) setRefreshing(true)
    else setLoading(true)
    try {
      const result = await groupsApi.listGroups({
        page: pageParam,
        perPage: pageSizeParam,
        q: searchParam || undefined,
        status: statusParam.length === 1 ? statusParam[0] : undefined,
        tenantId: actorTenantId,
      })
      setGroups(result.items)
      setTotal(result.total)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      hasLoadedRef.current = true
      setLoading(false)
      setRefreshing(false)
    }
  }, [actorTenantId, pageParam, pageSizeParam, searchParam, statusParam])

  useEffect(() => {
    void loadGroups()
  }, [loadGroups])

  const totalPages = Math.max(1, Math.ceil(total / pageSizeParam))

  const openCreate = () => {
    setEditTarget(null)
    reset(groupDefaultValues)
    setOpen(true)
  }

  const openEdit = (group: Group) => {
    setEditTarget(group)
    reset(toGroupValues(group))
    setOpen(true)
  }

  const closeForm = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      setEditTarget(null)
      reset(groupDefaultValues)
    }
  }

  const submit = handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      description: values.description?.trim() || "",
      status: values.status,
      tenantId: values.tenantId.trim(),
    }
    setSaving(true)
    try {
      if (editTarget) {
        await groupsApi.updateGroup(editTarget.id, payload)
        notify.success(t("admin.groups.update_success"))
      } else {
        await groupsApi.createGroup({ code: values.code.trim(), ...payload })
        notify.success(t("admin.groups.create_success"))
      }
      closeForm(false)
      await loadGroups()
    } catch (err) {
      notify.error(t("admin.groups.save_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  const handleDelete = async (group: Group) => {
    setDeleting(true)
    try {
      await groupsApi.deleteGroup(group.id, group.tenantId)
      notify.success(t("admin.groups.delete_success"))
      setDeleteTarget(null)
      await loadGroups()
    } catch (err) {
      notify.error(t("admin.groups.delete_failed"), translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<Group>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
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
          <DataTableColumnHeader
            column={column}
            label={t("common.field.code")}
          />
        ),
        enableColumnFilter: true,
        meta: {
          label: t("common.field.code"),
          variant: "text",
          placeholder: "Search groups",
        },
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.name")}
          />
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
        meta: {
          label: t("common.field.status"),
          variant: "multiSelect",
          options: [
            { label: "Active", value: "ACTIVE" },
            { label: "Disabled", value: "DISABLED" },
          ],
        },
        cell: ({ row }) => (
          <Status
            variant={row.original.status === "ACTIVE" ? "success" : "default"}
          >
            <StatusIndicator />
            <StatusLabel>{row.original.status || "-"}</StatusLabel>
          </Status>
        ),
      },
      {
        accessorKey: "memberCount",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.groups.field.members")}
          />
        ),
      },
      {
        accessorKey: "roleCount",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.groups.field.roles")}
          />
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.created")}
          />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        cell: ({ row }) => {
          const group = row.original
          return (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => setMemberTarget(group)}
                title={t("admin.groups.action.members")}
              >
                <Users className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => setRoleTarget(group)}
                title={t("admin.groups.action.roles")}
              >
                <ShieldCheck className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => openEdit(group)}
                title={t("common.action.edit")}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground hover:bg-red-50/50 hover:text-red-600"
                disabled={group.isSystem}
                onClick={() => setDeleteTarget(group)}
                title={t("common.action.delete")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [formatDate, t]
  )

  const { table } = useDataTable<Group>({
    columns,
    data: groups,
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
      <Dialog open={open} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? t("admin.groups.edit") : t("admin.groups.create")}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <FormField
              label={t("common.field.code")}
              error={errors.code?.message}
            >
              <Input
                aria-invalid={Boolean(errors.code)}
                disabled={Boolean(editTarget)}
                {...register("code")}
              />
            </FormField>
            <FormField
              label={t("common.field.name")}
              error={errors.name?.message}
            >
              <Input
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
            </FormField>
            <FormField
              label={t("admin.groups.field.description")}
              error={errors.description?.message}
            >
              <Textarea
                aria-invalid={Boolean(errors.description)}
                {...register("description")}
              />
            </FormField>
            <FormField
              label={t("common.field.status")}
              error={errors.status?.message}
            >
              <Input
                aria-invalid={Boolean(errors.status)}
                placeholder="ACTIVE/DISABLED"
                {...register("status", {
                  onChange: (event) => {
                    event.target.value = event.target.value.toUpperCase()
                  },
                })}
              />
            </FormField>
            <FormField
              label={t("admin.groups.field.tenant")}
              error={errors.tenantId?.message}
            >
              <Input
                aria-invalid={Boolean(errors.tenantId)}
                {...register("tenantId")}
              />
            </FormField>
            <Button
              className="w-full"
              type="submit"
              disabled={isSubmitting || saving}
            >
              {editTarget ? t("common.action.save") : t("common.action.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <GroupMembersDialog
        group={memberTarget}
        open={memberTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setMemberTarget(null)}
      />

      <GroupRolesDialog
        group={roleTarget}
        open={roleTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setRoleTarget(null)}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("common.confirm.delete_title")}
            </AlertDialogTitle>
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
      title={t("admin.groups.title")}
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("admin.groups.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadGroups}
      loadErrorTitle={t("admin.groups.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("admin.groups.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
