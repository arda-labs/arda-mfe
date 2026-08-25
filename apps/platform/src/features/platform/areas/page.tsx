import { useCallback, useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { Area, GeoAdminUnit, LookupValue } from "../api"
import { platformApi } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { MaskInput } from "@workspace/ui/components/mask-input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
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
import { Edit2, Trash2 } from "lucide-react"
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import {
  matchSelectFilter,
  matchTextColumnFilter,
  multiSelectFilterMeta,
  selectFilterMeta,
  textSearchMeta,
} from "@workspace/admin-list/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"

const DEFAULT_PAGE_SIZE = 10

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

function buildAreaSchema(t: TranslateFn) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, t("platform.areas.validation.code_required"))
      .max(64, t("platform.areas.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("platform.areas.validation.name_required"))
      .max(255, t("platform.areas.validation.name_too_long")),
    area_type_code: z
      .string()
      .trim()
      .min(1, t("platform.areas.validation.area_type_required")),
    parent_id: z.string().trim().optional(),
    admin_unit_code: z.string().trim().optional(),
    description: z
      .string()
      .trim()
      .max(500, t("platform.areas.validation.description_too_long"))
      .optional(),
    status: z.enum(["active", "inactive"]),
    effective_from: z.string().trim().optional(),
    effective_to: z.string().trim().optional(),
  })
}

type AreaFormValues = z.infer<ReturnType<typeof buildAreaSchema>>

const areaDefaultValues: AreaFormValues = {
  code: "",
  name: "",
  area_type_code: "",
  parent_id: "",
  admin_unit_code: "",
  description: "",
  status: "active",
  effective_from: "",
  effective_to: "",
}

function toAreaFormValues(item: Area): AreaFormValues {
  return {
    code: item.code,
    name: item.name,
    area_type_code: item.area_type_code,
    parent_id: item.parent_id || "",
    admin_unit_code: item.admin_unit_code || "",
    description: item.description || "",
    status: item.status,
    effective_from: item.effective_from || "",
    effective_to: item.effective_to || "",
  }
}

export function AreasPage() {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Area | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null)
  const [items, setItems] = useState<Area[]>([])
  const [areaTypes, setAreaTypes] = useState<LookupValue[]>([])
  const [adminUnits, setAdminUnits] = useState<GeoAdminUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadAreas = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
        const [areasResult, areaTypesResult, provinces, wards] =
        await Promise.all([
          platformApi.listAreas(),
          platformApi.listLookupValues("AREA_TYPE"),
          platformApi.listGeoAdminUnits(undefined, 1),
          platformApi.listGeoAdminUnits(undefined, 2),
        ])
      setItems(areasResult)
      setAreaTypes(areaTypesResult)
      setAdminUnits([...provinces, ...wards])
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadAreas(true)
  }, [loadAreas])

  const areaSchema = useMemo(() => buildAreaSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<AreaFormValues>({
    resolver: zodResolver(areaSchema),
    defaultValues: areaDefaultValues,
  })

  const getAreaTypeLabel = (code: string) =>
    areaTypes.find((item) => item.code === code)?.name || code

  const getAdminUnitLabel = (code?: string) =>
    adminUnits.find((item) => item.code === code)?.name || code || "-"

  const openCreate = () => {
    setEditingItem(null)
    reset(areaDefaultValues)
    setDialogOpen(true)
  }

  const openEdit = (item: Area) => {
    setEditingItem(item)
    reset(toAreaFormValues(item))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingItem(null)
      reset(areaDefaultValues)
    }
  }

  const submitArea = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<Area> = {
        code: values.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: values.name.trim(),
        area_type_code: values.area_type_code,
        parent_id: values.parent_id || undefined,
        admin_unit_code: values.admin_unit_code || undefined,
        description: values.description?.trim() || undefined,
        status: values.status,
        effective_from: values.effective_from || undefined,
        effective_to: values.effective_to || undefined,
      }

      if (editingItem) {
        await platformApi.updateArea(editingItem.id, payload)
        notify.success("Cap nhat khu vuc thanh cong")
      } else {
        await platformApi.createArea(payload)
        notify.success("Them khu vuc thanh cong")
      }

      setDialogOpen(false)
      reset(areaDefaultValues)
      await loadAreas()
    } catch (err) {
      notify.error("Luu khu vuc that bai", translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await platformApi.deleteArea(deleteTarget.id)
      notify.success("Ngung hieu luc khu vuc thanh cong")
      setDeleteTarget(null)
      await loadAreas()
    } catch (err) {
      notify.error(
        "Cap nhat trang thai khu vuc that bai",
        translateApiError(err)
      )
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<Area>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.areas.field.code")}
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
            label={t("platform.areas.field.name")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.areas.field.name"),
          t("platform.areas.placeholder.search")
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.description || "-"}
            </div>
          </div>
        ),
      },
      {
        id: "area_type_code",
        accessorKey: "area_type_code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.areas.field.area_type")}
          />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("platform.areas.field.area_type"),
          areaTypes.map((item) => ({ label: item.name, value: item.code }))
        ),
        cell: ({ row }) => getAreaTypeLabel(row.original.area_type_code),
      },
      {
        id: "parent",
        header: () => (
          <span className="text-xs font-semibold text-foreground/80">
            {t("platform.areas.field.parent")}
          </span>
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.parent_id || "-"}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "admin_unit",
        header: () => (
          <span className="text-xs font-semibold text-foreground/80">
            {t("platform.areas.field.admin_unit")}
          </span>
        ),
        cell: ({ row }) => getAdminUnitLabel(row.original.admin_unit_code),
        enableSorting: false,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.areas.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("platform.areas.field.status"), [
          { label: t("platform.areas.status.active"), value: "active" },
          { label: t("platform.areas.status.inactive"), value: "inactive" },
        ]),
        cell: ({ row }) => (
          <Status
            variant={row.original.status === "active" ? "success" : "default"}
          >
            <StatusIndicator />
            <StatusLabel>
              {row.original.status === "active"
                ? t("platform.areas.status.active")
                : t("platform.areas.status.inactive")}
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
              className="size-7"
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
    [t, areaTypes, adminUnits]
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      name: (item, value) => matchTextColumnFilter(value, item.code, item.name),
      area_type_code: (item, value) =>
        matchSelectFilter(item.area_type_code, value),
      status: (item, value) => matchSelectFilter(item.status, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        area_type_code: (a, b) =>
          a.area_type_code.localeCompare(b.area_type_code),
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const dialogs = (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? t("platform.areas.edit")
                : t("platform.areas.create_title")}
            </DialogTitle>
            <DialogDescription>
              {t("platform.areas.dialog_description")}
            </DialogDescription>
          </DialogHeader>

          <form
            autoComplete="off"
            onSubmit={submitArea}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label={t("platform.areas.field.code")}
                htmlFor="area_code"
                error={errors.code?.message}
              >
                <Input
                  id="area_code"
                  aria-invalid={Boolean(errors.code)}
                  disabled={!!editingItem}
                  {...register("code")}
                />
              </FormField>
              <FormField
                label={t("platform.areas.field.name")}
                htmlFor="area_name"
                error={errors.name?.message}
              >
                <Input
                  id="area_name"
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                label={t("platform.areas.field.area_type")}
                htmlFor="area_type_code"
                error={errors.area_type_code?.message}
              >
                <Controller
                  control={control}
                  name="area_type_code"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="area_type_code"
                        aria-invalid={Boolean(errors.area_type_code)}
                      >
                        <SelectValue
                          placeholder={t(
                            "platform.areas.placeholder.area_type"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {areaTypes.map((item) => (
                          <SelectItem key={item.id} value={item.code}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label={t("platform.areas.field.parent")}
                htmlFor="area_parent_id"
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
                        id="area_parent_id"
                        aria-invalid={Boolean(errors.parent_id)}
                      >
                        <SelectValue
                          placeholder={t(
                            "platform.areas.placeholder.parent_none"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {t("platform.areas.placeholder.parent_none")}
                        </SelectItem>
                        {items
                          .filter(
                            (item) => !editingItem || item.id !== editingItem.id
                          )
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label={t("platform.areas.field.admin_unit")}
                htmlFor="area_admin_unit_code"
                error={errors.admin_unit_code?.message}
              >
                <Controller
                  control={control}
                  name="admin_unit_code"
                  render={({ field }) => (
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger
                        id="area_admin_unit_code"
                        aria-invalid={Boolean(errors.admin_unit_code)}
                      >
                        <SelectValue
                          placeholder={t(
                            "platform.areas.placeholder.admin_unit_none"
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          {t("platform.areas.placeholder.admin_unit_none")}
                        </SelectItem>
                        {adminUnits.map((item) => (
                          <SelectItem key={item.code} value={item.code}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                label={t("platform.areas.field.status")}
                htmlFor="area_status"
                error={errors.status?.message}
              >
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="area_status"
                        aria-invalid={Boolean(errors.status)}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          {t("platform.areas.status.active")}
                        </SelectItem>
                        <SelectItem value="inactive">
                          {t("platform.areas.status.inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label={t("platform.areas.field.effective_from")}
                htmlFor="area_effective_from"
                error={errors.effective_from?.message}
              >
                <Controller
                  control={control}
                  name="effective_from"
                  render={({ field }) => (
                    <MaskInput
                      id="area_effective_from"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
              <FormField
                label={t("platform.areas.field.effective_to")}
                htmlFor="area_effective_to"
                error={errors.effective_to?.message}
              >
                <Controller
                  control={control}
                  name="effective_to"
                  render={({ field }) => (
                    <MaskInput
                      id="area_effective_to"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
            </div>

            <FormField
              label={t("platform.areas.field.description")}
              htmlFor="area_description"
              error={errors.description?.message}
            >
              <Textarea
                id="area_description"
                aria-invalid={Boolean(errors.description)}
                placeholder={t("platform.areas.placeholder.description")}
                {...register("description")}
              />
            </FormField>

            <div className="flex gap-2 sm:justify-end">
              <Button
                variant="outline"
                type="button"
                onClick={() => handleDialogOpenChange(false)}
              >
                {t("common.action.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || saving}>
                {isSubmitting || saving
                  ? t("common.action.saving")
                  : t("common.action.save")}
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
              {t("platform.areas.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.areas.delete.description", {
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
              {t("platform.areas.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <ListPageShell
      title={t("platform.areas.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.areas.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadAreas}
      loadErrorTitle={t("platform.areas.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("platform.areas.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
