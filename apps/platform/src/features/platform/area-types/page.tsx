import { useCallback, useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { LookupValue } from "../api"
import { platformApi } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableKeyCell } from "@workspace/ui/components/data-table/data-table-key-cell"
import { createActionsColumn } from "@workspace/admin-list/table-columns"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
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
import { ListPageShell } from "@workspace/admin-list/list-page-shell"
import {
  activeStatusMeta,
  matchBooleanActiveFilter,
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/admin-list/client-list"
import { ListTableToolbar } from "@workspace/admin-list/list-table-toolbar"

const AREA_TYPE_CATEGORY_CODE = "AREA_TYPE"

async function ensureAreaTypeCategory() {
  await platformApi.upsertLookupCategory({
    code: AREA_TYPE_CATEGORY_CODE,
    name: "Loai khu vuc",
    scope_type: "global",
    is_system: false,
    description: "Danh muc loai khu vuc",
  })
}

const DEFAULT_PAGE_SIZE = 10

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function buildAreaTypeSchema(t: TranslateFn) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, t("platform.area_types.validation.code_required"))
      .max(64, t("platform.area_types.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("platform.area_types.validation.name_required"))
      .max(255, t("platform.area_types.validation.name_too_long")),
    sort_order: z
      .number()
      .int(t("platform.area_types.validation.sort_integer"))
      .min(0, t("platform.area_types.validation.sort_invalid")),
    is_active: z.boolean(),
  })
}

type AreaTypeFormValues = z.infer<ReturnType<typeof buildAreaTypeSchema>>

const areaTypeDefaultValues: AreaTypeFormValues = {
  code: "",
  name: "",
  sort_order: 10,
  is_active: true,
}

function toAreaTypeFormValues(item: LookupValue): AreaTypeFormValues {
  return {
    code: item.code,
    name: item.name,
    sort_order: item.sort_order,
    is_active: item.is_active,
  }
}

export function AreaTypesPage() {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LookupValue | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LookupValue | null>(null)
  const [items, setItems] = useState<LookupValue[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadAreaTypes = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      await ensureAreaTypeCategory()
      const result = await platformApi.listLookupValues(AREA_TYPE_CATEGORY_CODE)
      setItems(result)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadAreaTypes(true)
  }, [loadAreaTypes])

  const areaTypeSchema = useMemo(() => buildAreaTypeSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<AreaTypeFormValues>({
    resolver: zodResolver(areaTypeSchema),
    defaultValues: areaTypeDefaultValues,
  })

  const openEdit = (item: LookupValue) => {
    setEditingItem(item)
    reset(toAreaTypeFormValues(item))
    setDialogOpen(true)
  }

  const columns = useMemo<ColumnDef<LookupValue>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.area_types.field.code")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.area_types.field.name")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.area_types.field.name"),
          t("platform.area_types.placeholder.search")
        ),
        cell: ({ row }) => (
          <DataTableKeyCell onActivate={() => openEdit(row.original)}>
            {row.original.name}
          </DataTableKeyCell>
        ),
      },
      {
        accessorKey: "sort_order",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.area_types.field.sort_order")} />
        ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.area_types.field.status")} />
        ),
        enableColumnFilter: true,
        meta: activeStatusMeta(
          t("platform.area_types.field.status"),
          t("platform.area_types.status.active"),
          t("platform.area_types.status.inactive")
        ),
        cell: ({ row }) => (
          <Status variant={row.original.is_active ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.is_active
                ? t("platform.area_types.status.active")
                : t("platform.area_types.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      createActionsColumn<LookupValue>({
        onEdit: openEdit,
        onDelete: setDeleteTarget,
        editTitle: t("common.action.edit"),
        deleteTitle: t("common.action.delete"),
        headerLabel: t("common.field.action"),
      }),
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      name: (item, value) => matchTextColumnFilter(value, item.code, item.name),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        sort_order: (a, b) => a.sort_order - b.sort_order,
        is_active: (a, b) => Number(a.is_active) - Number(b.is_active),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const openCreate = () => {
    setEditingItem(null)
    reset({ ...areaTypeDefaultValues, sort_order: items.length * 10 + 10 })
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingItem(null)
      reset(areaTypeDefaultValues)
    }
  }

  const submitAreaType = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<LookupValue> = {
        code: values.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: values.name.trim(),
        sort_order: values.sort_order,
        is_active: values.is_active,
      }
      if (editingItem) {
        payload.id = editingItem.id
        payload.category_id = editingItem.category_id
      }
      await ensureAreaTypeCategory()
      await platformApi.upsertLookupValue(AREA_TYPE_CATEGORY_CODE, payload)
      notify.success("Luu loai khu vuc thanh cong")
      setDialogOpen(false)
      reset(areaTypeDefaultValues)
      await loadAreaTypes()
    } catch (err) {
      notify.error("Luu loai khu vuc that bai", translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await platformApi.deleteLookupValue(deleteTarget.id)
      notify.success("Xoa loai khu vuc thanh cong")
      setDeleteTarget(null)
      await loadAreaTypes()
    } catch (err) {
      notify.error("Xoa loai khu vuc that bai", translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const dialogs = (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? t("platform.area_types.edit")
                : t("platform.area_types.create_title")}
            </DialogTitle>
            <DialogDescription>{t("platform.area_types.dialog_description")}</DialogDescription>
          </DialogHeader>
          <form autoComplete="off" onSubmit={submitAreaType} className="space-y-4 py-2">
            <FormField
              label={t("platform.area_types.field.code")}
              htmlFor="area_type_code"
              error={errors.code?.message}
            >
              <Input
                id="area_type_code"
                aria-invalid={Boolean(errors.code)}
                disabled={!!editingItem}
                className="font-mono uppercase"
                {...register("code")}
              />
            </FormField>
            <FormField
              label={t("platform.area_types.field.name")}
              htmlFor="area_type_name"
              error={errors.name?.message}
            >
              <Input id="area_type_name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t("platform.area_types.field.sort_order")}
                htmlFor="area_type_sort"
                error={errors.sort_order?.message}
              >
                <Input
                  id="area_type_sort"
                  type="number"
                  aria-invalid={Boolean(errors.sort_order)}
                  {...register("sort_order", { valueAsNumber: true })}
                />
              </FormField>
              <div className="flex items-center gap-2 pt-7">
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Checkbox
                      id="area_type_active"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <label htmlFor="area_type_active" className="cursor-pointer select-none text-sm font-medium">
                  {t("platform.area_types.field.is_active")}
                </label>
              </div>
            </div>
            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleDialogOpenChange(false)}>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("platform.area_types.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.area_types.delete.description", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("platform.area_types.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <ListPageShell
      title={t("platform.area_types.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.area_types.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadAreaTypes}
      loadErrorTitle={t("platform.area_types.load_failed")}
      fetching={refreshing}
      table={table}
      onRowDoubleClick={(row) => openEdit(row.original)}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("platform.area_types.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
