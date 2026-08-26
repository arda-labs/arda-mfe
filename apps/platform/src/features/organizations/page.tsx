import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import type { Organization } from "../api"
import { platformApi } from "../api"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Building2, Edit2, FolderTree, List, Plus, Trash2 } from "lucide-react"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"
import { PageErrorDialog } from "@workspace/admin-list/page-error-dialog"
import { useServerList } from "@workspace/admin-list/server-list"
import { useAppQueryClient } from "@workspace/query/provider"
import { useServerDataTable } from "@workspace/admin-list/server-data-table"
import { organizationsListDefinition } from "./list-query"

const ORGANIZATIONS_QUERY_KEY = ["platform", "organizations"] as const

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

function buildOrganizationSchema(t: TranslateFn) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, t("platform.organizations.validation.code_required"))
      .max(64, t("platform.organizations.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("platform.organizations.validation.name_required"))
      .max(255, t("platform.organizations.validation.name_too_long")),
    parent_id: z.string().trim().optional(),
    address: z
      .string()
      .trim()
      .max(500, t("platform.organizations.validation.address_too_long"))
      .optional(),
    is_active: z.boolean(),
  })
}

type OrganizationFormValues = z.infer<
  ReturnType<typeof buildOrganizationSchema>
>

const organizationDefaultValues: OrganizationFormValues = {
  code: "",
  name: "",
  parent_id: "",
  address: "",
  is_active: true,
}

function toOrganizationFormValues(item: Organization): OrganizationFormValues {
  return {
    code: item.code,
    name: item.name,
    parent_id: item.parent_id || "",
    address: item.address || "",
    is_active: item.is_active,
  }
}

export function OrganizationsPage() {
  const { t } = useI18n()
  const [viewMode, setViewMode] = useState<"list" | "tree">("list")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const queryClient = useAppQueryClient()

  const organizationSchema = useMemo(() => buildOrganizationSchema(t), [t])
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationSchema),
    defaultValues: organizationDefaultValues,
  })

  const treeQuery = useServerList({
    queryKey: [...ORGANIZATIONS_QUERY_KEY, "tree"],
    query: { view: "tree" },
    queryFn: (query, { signal }) =>
      platformApi.listOrganizations(query, { signal }),
    enabled: viewMode === "tree",
    staleTime: 5 * 60_000,
  })
  const optionsQuery = useServerList({
    queryKey: [...ORGANIZATIONS_QUERY_KEY, "options"],
    query: { view: "options" },
    queryFn: (query, { signal }) =>
      platformApi.listOrganizations(query, { signal }),
    enabled: dialogOpen,
    staleTime: 5 * 60_000,
  })

  const treeOrgs = treeQuery.items
  const orgOptions = optionsQuery.items

  const openCreate = () => {
    setEditingOrg(null)
    reset(organizationDefaultValues)
    setDialogOpen(true)
  }

  const openEdit = (org: Organization) => {
    setEditingOrg(org)
    reset(toOrganizationFormValues(org))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingOrg(null)
      reset(organizationDefaultValues)
    }
  }

  const submitOrganization = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<Organization> = {
        code: values.code.trim(),
        name: values.name.trim(),
        parent_id: values.parent_id || undefined,
        address: values.address?.trim() || undefined,
        is_active: values.is_active,
      }

      if (editingOrg) {
        await platformApi.updateOrganization(editingOrg.id, payload)
        notify.success("Cap nhat to chuc thanh cong")
      } else {
        await platformApi.createOrganization(payload)
        notify.success("Them to chuc thanh cong")
      }
      setDialogOpen(false)
      reset(organizationDefaultValues)
      await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY })
    } catch (err) {
      notify.error("Sua to chuc that bai", translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await platformApi.deleteOrganization(deleteTarget.id)
      notify.success("Xoa to chuc thanh cong")
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: ORGANIZATIONS_QUERY_KEY })
    } catch (err) {
      notify.error("Xoa to chuc that bai", translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<Organization>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.organizations.field.code")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.organizations.field.name")}
          />
        ),
        enableColumnFilter: true,
        meta: {
          label: t("platform.organizations.field.name"),
          variant: "text",
          placeholder: t("platform.organizations.placeholder.search"),
        },
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "parent",
        header: () => (
          <span className="text-xs font-semibold text-foreground/80">
            {t("platform.organizations.field.parent")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.parent_name ?? "-"}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "is_active",
        accessorKey: "is_active",
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
            {
              label: t("platform.organizations.status.active"),
              value: "true",
            },
            {
              label: t("platform.organizations.status.inactive"),
              value: "false",
            },
          ],
        },
        cell: ({ row }) => (
          <Status variant={row.original.is_active ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.is_active
                ? t("platform.organizations.status.active")
                : t("platform.organizations.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right text-xs font-semibold text-foreground/80">
            {t("common.field.action")}
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground"
              title={t("common.action.edit")}
              onClick={() => openEdit(row.original)}
            >
              <Edit2 className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              title={t("common.action.delete")}
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t]
  )

  const listQuery = useServerDataTable<Organization>({
    ...organizationsListDefinition,
    columns,
    queryFn: (query, { signal }) =>
      platformApi.listOrganizations(query, { signal }),
    enabled: viewMode === "list",
  })
  const { table } = listQuery
  const activeQuery = viewMode === "list" ? listQuery : treeQuery
  const total = activeQuery.total

  const renderTree = (parentId: string | undefined = undefined, depth = 0) => {
    const children = treeOrgs.filter((org) => org.parent_id === parentId)
    if (children.length === 0) return null

    return (
      <div
        className={`space-y-2 ${depth > 0 ? "mt-2 ml-3 border-l border-muted/80 pl-6" : ""}`}
      >
        {children.map((org) => (
          <div key={org.id} className="group">
            <div className="flex items-center justify-between rounded-xl border border-muted/60 bg-muted/10 p-3 transition-all hover:bg-muted/20">
              <div className="flex items-center gap-3">
                <Building2 className="size-4 text-primary/70" />
                <div>
                  <span className="text-sm font-semibold">{org.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    ({org.code})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7"
                  title={t("common.action.edit")}
                  onClick={() => openEdit(org)}
                >
                  <Edit2 className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-destructive"
                  title={t("common.action.delete")}
                  onClick={() => setDeleteTarget(org)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            {renderTree(org.id, depth + 1)}
          </div>
        ))}
      </div>
    )
  }

  const viewModeToggle = (
    <div className="flex rounded-lg border border-input bg-background p-0.5">
      <Button
        variant={viewMode === "list" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 rounded-md px-2.5"
        onClick={() => setViewMode("list")}
      >
        <List className="mr-1 size-3.5" />
        {t("platform.organizations.view.list")}
      </Button>
      <Button
        variant={viewMode === "tree" ? "secondary" : "ghost"}
        size="sm"
        className="h-7 rounded-md px-2.5"
        onClick={() => setViewMode("tree")}
      >
        <FolderTree className="mr-1 size-3.5" />
        {t("platform.organizations.view.tree")}
      </Button>
    </div>
  )

  const pageHeader = (
    <PageHeader
      title={t("platform.organizations.title")}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("platform.organizations.count", { count: total })}
        </Badge>
      }
      actions={viewModeToggle}
    />
  )

  if (activeQuery.isPending && activeQuery.items.length === 0) {
    return (
      <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
        {pageHeader}
        <DataTableSkeleton
          className="min-h-0 flex-1"
          columnCount={5}
          rowCount={10}
          filterCount={2}
        />
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      {pageHeader}

      {viewMode === "tree" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
          <div className="flex shrink-0 justify-end">
            <Button
              onClick={openCreate}
              className="h-8 px-3 text-xs font-semibold"
            >
              <Plus className="mr-1 size-3.5" />
              {t("platform.organizations.create")}
            </Button>
          </div>
          <Card className="min-h-0 flex-1 overflow-hidden">
            <CardContent className="h-full overflow-y-auto p-6">
              {treeOrgs.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t("platform.organizations.empty")}
                </p>
              ) : (
                renderTree(undefined)
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <DataTable
          layout="panel"
          table={table}
          totalRows={total}
          className="min-h-0 flex-1"
          fetching={listQuery.isFetching}
        >
          <ListTableToolbar
            table={table}
            onCreate={openCreate}
            createLabel={t("platform.organizations.create")}
          />
        </DataTable>
      )}

      <PageErrorDialog
        open={activeQuery.isError && !activeQuery.isFetching}
        error={activeQuery.error}
        onRetry={() => void activeQuery.refetch()}
      />

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingOrg
                ? t("platform.organizations.edit")
                : t("platform.organizations.create_title")}
            </DialogTitle>
            <DialogDescription>
              {t("platform.organizations.dialog_description")}
            </DialogDescription>
          </DialogHeader>

          <form
            autoComplete="off"
            onSubmit={submitOrganization}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t("platform.organizations.field.code")}
                htmlFor="org_code"
                error={errors.code?.message}
              >
                <Input
                  id="org_code"
                  placeholder={t("platform.organizations.placeholder.code")}
                  aria-invalid={Boolean(errors.code)}
                  disabled={!!editingOrg}
                  spellCheck={false}
                  {...register("code")}
                />
              </FormField>
              <FormField
                label={t("platform.organizations.field.name")}
                htmlFor="org_name"
                error={errors.name?.message}
              >
                <Input
                  id="org_name"
                  placeholder={t("platform.organizations.placeholder.name")}
                  aria-invalid={Boolean(errors.name)}
                  spellCheck={false}
                  {...register("name")}
                />
              </FormField>
            </div>

            <FormField
              label={t("platform.organizations.field.parent")}
              htmlFor="org_parent_id"
              error={errors.parent_id?.message}
            >
              <Controller
                control={control}
                name="parent_id"
                render={({ field }) => (
                  <Select
                    value={field.value || "none"}
                    onValueChange={(value) =>
                      field.onChange(value === "none" ? "" : value)
                    }
                  >
                    <SelectTrigger
                      id="org_parent_id"
                      aria-invalid={Boolean(errors.parent_id)}
                    >
                      <SelectValue
                        placeholder={t(
                          "platform.organizations.placeholder.parent_none"
                        )}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        {t("platform.organizations.placeholder.parent_none")}
                      </SelectItem>
                      {orgOptions
                        .filter(
                          (org) => !editingOrg || org.id !== editingOrg.id
                        )
                        .map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label={t("platform.organizations.field.address")}
              htmlFor="org_address"
              error={errors.address?.message}
            >
              <Input
                id="org_address"
                placeholder={t("platform.organizations.placeholder.address")}
                aria-invalid={Boolean(errors.address)}
                spellCheck={false}
                {...register("address")}
              />
            </FormField>

            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="org_is_active"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                  <label
                    htmlFor="org_is_active"
                    className="cursor-pointer text-sm font-medium select-none"
                  >
                    {t("platform.organizations.field.is_active")}
                  </label>
                </div>
              )}
            />

            <div className="flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleDialogOpenChange(false)}
              >
                {t("common.action.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("common.action.saving") : t("common.action.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("platform.organizations.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.organizations.delete.description", {
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("platform.organizations.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
