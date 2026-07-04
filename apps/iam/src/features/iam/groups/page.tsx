import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import type { Group, Role, User } from "@/features/iam"
import {
  useCreateGroup,
  useDeleteGroup,
  useGroupMemberOptions,
  useGroupRoleOptions,
  useGroups,
  useSetGroupMember,
  useSetGroupRole,
  useUpdateGroup,
} from "@/features/iam/groups/queries"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
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
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Textarea } from "@workspace/ui/components/textarea"
import { useDataTable } from "@workspace/ui/hooks/use-data-table"
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  useQueryState,
} from "nuqs"
import { listQueryShellState, pageGateFromQueries } from "@workspace/core/query/list-query"
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
  tenantId: "default",
}

function toGroupValues(group: Group): GroupFormValues {
  return {
    code: group.code,
    name: group.name,
    description: group.description ?? "",
    status: group.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    tenantId: group.tenantId || "default",
  }
}

export function GroupsPage() {
  const { t, formatDate } = useI18n()
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Group | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)
  const [memberTarget, setMemberTarget] = useState<Group | null>(null)
  const [roleTarget, setRoleTarget] = useState<Group | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: groupDefaultValues,
  })

  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const setGroupMember = useSetGroupMember()
  const setGroupRole = useSetGroupRole()
  const memberOptions = useGroupMemberOptions(memberTarget?.id)
  const roleOptions = useGroupRoleOptions(roleTarget?.id)
  const busyMemberID = setGroupMember.isPending
    ? setGroupMember.variables?.userId
    : null
  const busyRoleID = setGroupRole.isPending
    ? setGroupRole.variables?.roleId
    : null

  const [pageParam] = useQueryState("page", parseAsInteger.withDefault(1))
  const [pageSizeParam] = useQueryState(
    "perPage",
    parseAsInteger.withDefault(DEFAULT_PAGE_SIZE)
  )
  const [searchParam] = useQueryState("code", parseAsString)
  const [statusParam] = useQueryState(
    "status",
    parseAsArrayOf(parseAsString, ",").withDefault([])
  )
  const groupsQuery = useGroups({
    page: pageParam,
    size: pageSizeParam,
    search: searchParam || undefined,
    status: statusParam.length === 1 ? statusParam[0] : undefined,
  })
  const groups = groupsQuery.data?.groups ?? []
  const total = groupsQuery.data?.total ?? 0
  const pageGate = pageGateFromQueries(groupsQuery)
  const { fetching } = listQueryShellState(groupsQuery)
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
      tenantId: values.tenantId.trim() || "default",
    }
    try {
      if (editTarget) {
        await updateGroup.mutateAsync({ id: editTarget.id, data: payload })
        notify.success("Da cap nhat nhom")
      } else {
        await createGroup.mutateAsync({ code: values.code.trim(), ...payload })
        notify.success("Da tao nhom")
      }
      closeForm(false)
    } catch (err) {
      notify.error("Khong luu duoc nhom", translateApiError(err))
    }
  })

  const handleDelete = async (group: Group) => {
    try {
      await deleteGroup.mutateAsync(group.id)
      notify.success("Da xoa nhom")
      setDeleteTarget(null)
    } catch (err) {
      notify.error("Khong xoa duoc nhom", translateApiError(err))
    }
  }

  const toggleMember = async (user: User, assigned: boolean) => {
    if (!memberTarget) return
    try {
      await setGroupMember.mutateAsync({
        groupId: memberTarget.id,
        userId: user.id,
        assigned,
      })
      notify.success("Da cap nhat thanh vien")
    } catch (err) {
      notify.error("Khong cap nhat duoc thanh vien", translateApiError(err))
    }
  }

  const toggleRole = async (role: Role, assigned: boolean) => {
    if (!roleTarget) return
    try {
      await setGroupRole.mutateAsync({
        groupId: roleTarget.id,
        roleId: role.id,
        assigned,
      })
      notify.success("Da cap nhat vai tro")
    } catch (err) {
      notify.error("Khong cap nhat duoc vai tro", translateApiError(err))
    }
  }

  const memberIDs = useMemo(
    () => new Set((memberOptions.data?.members ?? []).map((user) => user.id)),
    [memberOptions.data?.members]
  )
  const groupRoleIDs = useMemo(
    () => new Set((roleOptions.data?.groupRoles ?? []).map((role) => role.id)),
    [roleOptions.data?.groupRoles]
  )

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
          <DataTableColumnHeader column={column} label={t("common.field.code")} />
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
          <DataTableColumnHeader column={column} label="Members" />
        ),
      },
      {
        accessorKey: "roleCount",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Roles" />
        ),
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
                title="Members"
              >
                <Users className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => setRoleTarget(group)}
                title="Roles"
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

  useEffect(() => {
    if (memberOptions.error)
      notify.error(
        "Khong tai duoc thanh vien nhom",
        translateApiError(memberOptions.error)
      )
    if (roleOptions.error)
      notify.error(
        "Khong tai duoc vai tro nhom",
        translateApiError(roleOptions.error)
      )
  }, [memberOptions.error, roleOptions.error])

  const dialogs = (
    <>
      <Dialog open={open} onOpenChange={closeForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Edit Group" : "Create Group"}
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
            <FormField label="Description" error={errors.description?.message}>
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
            <FormField label="Tenant" error={errors.tenantId?.message}>
              <Input
                aria-invalid={Boolean(errors.tenantId)}
                {...register("tenantId")}
              />
            </FormField>
            <Button
              className="w-full"
              type="submit"
              disabled={
                isSubmitting || createGroup.isPending || updateGroup.isPending
              }
            >
              {editTarget ? "Save changes" : "Create"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={memberTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setMemberTarget(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Members of {memberTarget?.name || memberTarget?.code || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-2 overflow-auto pr-1">
            {memberOptions.isLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading members...
              </div>
            ) : (memberOptions.data?.users ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No users available.
              </div>
            ) : (
              (memberOptions.data?.users ?? []).map((user) => {
                const assigned = memberIDs.has(user.id)
                return (
                  <label
                    key={user.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={assigned}
                      disabled={busyMemberID === user.id}
                      onCheckedChange={() => toggleMember(user, assigned)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {user.name || user.username || user.email}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </label>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={roleTarget !== null}
        onOpenChange={(nextOpen) => !nextOpen && setRoleTarget(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Roles of {roleTarget?.name || roleTarget?.code || ""}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-2 overflow-auto pr-1">
            {roleOptions.isLoading ? (
              <div className="text-sm text-muted-foreground">
                Loading roles...
              </div>
            ) : (roleOptions.data?.roles ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No roles available.
              </div>
            ) : (
              (roleOptions.data?.roles ?? []).map((role) => {
                const assigned = groupRoleIDs.has(role.id)
                return (
                  <label
                    key={role.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={assigned}
                      disabled={busyRoleID === role.id}
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
              disabled={deleteGroup.isPending}
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
      title="Groups"
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-[10px] font-bold">
          {total} groups
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
          onCreate={openCreate}
          createLabel="Create Group"
        />
      }
      dialogs={dialogs}
    />
  )
}
