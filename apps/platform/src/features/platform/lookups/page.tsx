import { useEffect, useMemo, useState, type MouseEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import type { LookupCategory, LookupValue } from "../api"
import { notify } from "@workspace/notifications/notify"
import {
  useDeleteLookupCategory,
  useDeleteLookupValue,
  useLookupCategories,
  useLookupValues,
  useUpsertLookupCategory,
  useUpsertLookupValue,
} from "./queries"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { DataTableSkeleton } from "@workspace/ui/components/data-table/data-table-skeleton"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Textarea } from "@workspace/ui/components/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
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
import { ChevronRight, Edit2, Plus, Tag, Trash2 } from "lucide-react"
import {
  activeStatusMeta,
  matchBooleanActiveFilter,
  matchTextColumnFilter,
  textSearchMeta,
} from "../shared/column-filters"
import { sortByColumn, useClientListTable } from "../shared/client-list"
import { ListTableToolbar } from "../shared/list-table-toolbar"

const DEFAULT_PAGE_SIZE = 10

const scopeTypeValues = ["global", "tenant", "org", "branch", "department"] as const

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function buildCategorySchema(t: TranslateFn) {
  return z
    .object({
      code: z
        .string()
        .trim()
        .min(1, t("platform.lookups.validation.code_required"))
        .max(64, t("platform.lookups.validation.code_too_long")),
      name: z
        .string()
        .trim()
        .min(1, t("platform.lookups.validation.name_required"))
        .max(255, t("platform.lookups.validation.name_too_long")),
      scope_type: z.enum(scopeTypeValues),
      scope_id: z.string().trim().optional(),
      is_system: z.boolean(),
      description: z
        .string()
        .trim()
        .max(500, t("platform.lookups.validation.description_too_long"))
        .optional(),
    })
    .superRefine((values, ctx) => {
      if (values.scope_type !== "global" && !values.scope_id?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: t("platform.lookups.validation.scope_id_required"),
          path: ["scope_id"],
        })
      }
    })
}

function buildValueSchema(t: TranslateFn) {
  return z
    .object({
      code: z
        .string()
        .trim()
        .min(1, t("platform.lookups.validation.val_code_required"))
        .max(64, t("platform.lookups.validation.val_code_too_long")),
      name: z
        .string()
        .trim()
        .min(1, t("platform.lookups.validation.val_name_required"))
        .max(255, t("platform.lookups.validation.val_name_too_long")),
      sort_order: z
        .number()
        .int(t("platform.lookups.validation.sort_integer"))
        .min(0, t("platform.lookups.validation.sort_invalid")),
      is_active: z.boolean(),
      metadata: z.string().trim().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.metadata?.trim()) {
        try {
          JSON.parse(values.metadata)
        } catch {
          ctx.addIssue({
            code: "custom",
            message: t("platform.lookups.validation.metadata_invalid"),
            path: ["metadata"],
          })
        }
      }
    })
}

type CategoryFormValues = z.infer<ReturnType<typeof buildCategorySchema>>
type ValueFormValues = z.infer<ReturnType<typeof buildValueSchema>>

const categoryDefaultValues: CategoryFormValues = {
  code: "",
  name: "",
  scope_type: "global",
  scope_id: "",
  is_system: false,
  description: "",
}

const valueDefaultValues: ValueFormValues = {
  code: "",
  name: "",
  sort_order: 0,
  is_active: true,
  metadata: "",
}

function toCategoryFormValues(item: LookupCategory): CategoryFormValues {
  return {
    code: item.code,
    name: item.name,
    scope_type: item.scope_type,
    scope_id: item.scope_id || "",
    is_system: item.is_system,
    description: item.description || "",
  }
}

function toValueFormValues(item: LookupValue): ValueFormValues {
  return {
    code: item.code,
    name: item.name,
    sort_order: item.sort_order,
    is_active: item.is_active,
    metadata: item.metadata || "",
  }
}

export function LookupsPage() {
  const { t } = useI18n()
  const [selectedCat, setSelectedCat] = useState<LookupCategory | null>(null)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<LookupCategory | null>(null)
  const [deleteCatTarget, setDeleteCatTarget] = useState<LookupCategory | null>(null)
  const [valDialogOpen, setValDialogOpen] = useState(false)
  const [editingVal, setEditingVal] = useState<LookupValue | null>(null)
  const [deleteValTarget, setDeleteValTarget] = useState<LookupValue | null>(null)

  const categorySchema = useMemo(() => buildCategorySchema(t), [t])
  const valueSchema = useMemo(() => buildValueSchema(t), [t])

  const {
    control: catControl,
    formState: { errors: catErrors, isSubmitting: isCatSubmitting },
    handleSubmit: handleCatSubmit,
    register: registerCat,
    reset: resetCat,
    setValue: setCatValue,
    watch: watchCat,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: categoryDefaultValues,
  })
  const {
    control: valControl,
    formState: { errors: valErrors, isSubmitting: isValSubmitting },
    handleSubmit: handleValSubmit,
    register: registerVal,
    reset: resetVal,
  } = useForm<ValueFormValues>({
    resolver: zodResolver(valueSchema),
    defaultValues: valueDefaultValues,
  })

  const catScopeType = watchCat("scope_type")
  const categoriesQuery = useLookupCategories()
  const valuesQuery = useLookupValues(selectedCat?.code)
  const upsertCategoryMutation = useUpsertLookupCategory()
  const deleteCategoryMutation = useDeleteLookupCategory()
  const upsertValueMutation = useUpsertLookupValue(selectedCat?.code)
  const deleteValueMutation = useDeleteLookupValue(selectedCat?.code)

  const categories = categoriesQuery.data ?? []
  const values = valuesQuery.data ?? []
  const loadingCats = categoriesQuery.isLoading
  const loadingValues = valuesQuery.isLoading

  useEffect(() => {
    if (categoriesQuery.error) {
      notify.error(
        t("platform.lookups.load_categories_failed"),
        translateApiError(categoriesQuery.error)
      )
    }
  }, [categoriesQuery.error, t])

  useEffect(() => {
    if (!selectedCat && categories.length > 0) {
      setSelectedCat(categories[0])
    }
  }, [categories, selectedCat])

  useEffect(() => {
    if (valuesQuery.error) {
      notify.error(
        t("platform.lookups.load_values_failed"),
        translateApiError(valuesQuery.error)
      )
    }
  }, [valuesQuery.error, t])

  const openCreateCat = () => {
    setEditingCat(null)
    resetCat(categoryDefaultValues)
    setCatDialogOpen(true)
  }

  const openEditCat = (cat: LookupCategory, event: MouseEvent) => {
    event.stopPropagation()
    setEditingCat(cat)
    resetCat(toCategoryFormValues(cat))
    setCatDialogOpen(true)
  }

  const handleCatDialogOpenChange = (open: boolean) => {
    setCatDialogOpen(open)
    if (!open) {
      setEditingCat(null)
      resetCat(categoryDefaultValues)
    }
  }

  const submitCategory = handleCatSubmit(async (formValues) => {
    try {
      const payload: Partial<LookupCategory> = {
        code: formValues.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: formValues.name.trim(),
        scope_type: formValues.scope_type,
        scope_id: formValues.scope_id?.trim() || undefined,
        is_system: formValues.is_system,
        description: formValues.description?.trim() || undefined,
      }
      if (editingCat) {
        payload.id = editingCat.id
      }
      const saved = await upsertCategoryMutation.mutateAsync(payload)
      setCatDialogOpen(false)
      resetCat(categoryDefaultValues)
      setSelectedCat(saved)
    } catch {
      // Mutation hook owns the toast.
    }
  })

  const handleCatDelete = async () => {
    if (!deleteCatTarget) return
    try {
      await deleteCategoryMutation.mutateAsync(deleteCatTarget.id)
      if (selectedCat?.id === deleteCatTarget.id) {
        setSelectedCat(null)
      }
      setDeleteCatTarget(null)
    } catch {
      // Mutation hook owns the toast.
    }
  }

  const openCreateVal = () => {
    if (!selectedCat) return
    setEditingVal(null)
    resetVal({
      ...valueDefaultValues,
      sort_order: values.length * 10 + 10,
    })
    setValDialogOpen(true)
  }

  const openEditVal = (value: LookupValue) => {
    setEditingVal(value)
    resetVal(toValueFormValues(value))
    setValDialogOpen(true)
  }

  const handleValDialogOpenChange = (open: boolean) => {
    setValDialogOpen(open)
    if (!open) {
      setEditingVal(null)
      resetVal(valueDefaultValues)
    }
  }

  const submitValue = handleValSubmit(async (formValues) => {
    if (!selectedCat) return
    try {
      const payload: Partial<LookupValue> = {
        code: formValues.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: formValues.name.trim(),
        sort_order: formValues.sort_order,
        is_active: formValues.is_active,
        metadata: formValues.metadata?.trim() || undefined,
      }
      if (editingVal) {
        payload.id = editingVal.id
        payload.category_id = editingVal.category_id
      }
      await upsertValueMutation.mutateAsync(payload)
      setValDialogOpen(false)
      resetVal(valueDefaultValues)
    } catch {
      // Mutation hook owns the toast.
    }
  })

  const handleValDelete = async () => {
    if (!deleteValTarget || !selectedCat) return
    try {
      await deleteValueMutation.mutateAsync(deleteValTarget.id)
      setDeleteValTarget(null)
    } catch {
      // Mutation hook owns the toast.
    }
  }

  const columns = useMemo<ColumnDef<LookupValue>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.lookups.field.code")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs text-primary">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.lookups.field.name")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.lookups.field.name"),
          t("platform.lookups.placeholder.search")
        ),
        cell: ({ row }) => <span className="font-semibold">{row.original.name}</span>,
      },
      {
        accessorKey: "sort_order",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.lookups.field.sort_order")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.sort_order}</span>
        ),
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.lookups.field.status")} />
        ),
        enableColumnFilter: true,
        meta: activeStatusMeta(
          t("platform.lookups.field.status"),
          t("platform.lookups.status.active"),
          t("platform.lookups.status.inactive")
        ),
        cell: ({ row }) => (
          <Status variant={row.original.is_active ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.is_active
                ? t("platform.lookups.status.active")
                : t("platform.lookups.status.inactive")}
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
          <div className="flex items-center justify-end gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              title={t("common.action.edit")}
              onClick={() => openEditVal(row.original)}
            >
              <Edit2 className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive"
              title={t("common.action.delete")}
              onClick={() => setDeleteValTarget(row.original)}
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

  const { table, total: valuesTotal } = useClientListTable({
    columns,
    items: values,
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

  const valuesPanel = !selectedCat ? (
    <div className="flex min-h-0 flex-1 items-center justify-center rounded-xl border border-muted/50 text-sm text-muted-foreground">
      {t("platform.lookups.values.select_category")}
    </div>
  ) : loadingValues && values.length === 0 ? (
    <DataTableSkeleton className="min-h-0 flex-1" columnCount={5} rowCount={8} filterCount={1} />
  ) : (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {t("platform.lookups.values.title", { name: selectedCat.name })}
          </p>
          {selectedCat.description && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{selectedCat.description}</p>
          )}
          <Badge variant="secondary" className="mt-1.5 px-2 py-0 text-[10px] font-bold">
            {t("platform.lookups.values.count", { count: valuesTotal })}
          </Badge>
        </div>
      </div>
      <DataTable layout="panel" table={table} className="min-h-0 flex-1">
        <ListTableToolbar
          table={table}
          onCreate={openCreateVal}
          createLabel={t("platform.lookups.values.create")}
        />
      </DataTable>
    </div>
  )

  const dialogs = (
    <>
      <Dialog open={catDialogOpen} onOpenChange={handleCatDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCat
                ? t("platform.lookups.category.edit")
                : t("platform.lookups.category.create_title")}
            </DialogTitle>
            <DialogDescription>{t("platform.lookups.category.dialog_description")}</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitCategory} className="space-y-4 py-2">
            <FormField
              label={t("platform.lookups.field.code")}
              htmlFor="cat_code"
              error={catErrors.code?.message}
            >
              <Input
                id="cat_code"
                placeholder={t("platform.lookups.placeholder.cat_code")}
                aria-invalid={Boolean(catErrors.code)}
                disabled={!!editingCat}
                className="font-mono uppercase"
                spellCheck={false}
                {...registerCat("code", {
                  onChange: (event) => {
                    event.target.value = event.target.value.toUpperCase().replace(/\s+/g, "_")
                  },
                })}
              />
            </FormField>
            <FormField
              label={t("platform.lookups.field.name")}
              htmlFor="cat_name"
              error={catErrors.name?.message}
            >
              <Input
                id="cat_name"
                placeholder={t("platform.lookups.placeholder.cat_name")}
                aria-invalid={Boolean(catErrors.name)}
                spellCheck={false}
                {...registerCat("name")}
              />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t("platform.lookups.field.scope_type")}
                htmlFor="cat_scope_type"
                error={catErrors.scope_type?.message}
              >
                <Controller
                  control={catControl}
                  name="scope_type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value)
                        setCatValue("scope_id", "", { shouldDirty: true, shouldValidate: true })
                      }}
                    >
                      <SelectTrigger id="cat_scope_type" aria-invalid={Boolean(catErrors.scope_type)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {scopeTypeValues.map((scope) => (
                          <SelectItem key={scope} value={scope}>
                            {t(`platform.lookups.scope_type.${scope}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              {catScopeType !== "global" && (
                <FormField
                  label={t("platform.lookups.field.scope_id")}
                  htmlFor="cat_scope_id"
                  error={catErrors.scope_id?.message}
                >
                  <Input
                    id="cat_scope_id"
                    placeholder={t("platform.lookups.placeholder.scope_id")}
                    aria-invalid={Boolean(catErrors.scope_id)}
                    spellCheck={false}
                    {...registerCat("scope_id")}
                  />
                </FormField>
              )}
            </div>
            <FormField
              label={t("platform.lookups.field.description")}
              htmlFor="cat_description"
              error={catErrors.description?.message}
            >
              <Input
                id="cat_description"
                placeholder={t("platform.lookups.placeholder.cat_description")}
                aria-invalid={Boolean(catErrors.description)}
                spellCheck={false}
                {...registerCat("description")}
              />
            </FormField>

            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleCatDialogOpenChange(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button type="submit" disabled={isCatSubmitting || upsertCategoryMutation.isPending}>
                {isCatSubmitting || upsertCategoryMutation.isPending
                  ? t("common.action.saving")
                  : t("common.action.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={valDialogOpen} onOpenChange={handleValDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingVal
                ? t("platform.lookups.value.edit")
                : t("platform.lookups.value.create_title")}
            </DialogTitle>
            <DialogDescription>{t("platform.lookups.value.dialog_description")}</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitValue} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t("platform.lookups.field.code")}
                htmlFor="val_code"
                error={valErrors.code?.message}
              >
                <Input
                  id="val_code"
                  placeholder={t("platform.lookups.placeholder.val_code")}
                  aria-invalid={Boolean(valErrors.code)}
                  disabled={!!editingVal}
                  className="font-mono uppercase"
                  spellCheck={false}
                  {...registerVal("code", {
                    onChange: (event) => {
                      event.target.value = event.target.value.toUpperCase().replace(/\s+/g, "_")
                    },
                  })}
                />
              </FormField>
              <FormField
                label={t("platform.lookups.field.name")}
                htmlFor="val_name"
                error={valErrors.name?.message}
              >
                <Input
                  id="val_name"
                  placeholder={t("platform.lookups.placeholder.val_name")}
                  aria-invalid={Boolean(valErrors.name)}
                  spellCheck={false}
                  {...registerVal("name")}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                label={t("platform.lookups.field.sort_order")}
                htmlFor="val_sort"
                error={valErrors.sort_order?.message}
              >
                <Input
                  id="val_sort"
                  type="number"
                  aria-invalid={Boolean(valErrors.sort_order)}
                  {...registerVal("sort_order", { valueAsNumber: true })}
                />
              </FormField>
              <Controller
                control={valControl}
                name="is_active"
                render={({ field }) => (
                  <div className="flex items-center gap-2 pt-6">
                    <Checkbox
                      id="val_active"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                    <label htmlFor="val_active" className="cursor-pointer select-none text-sm font-medium">
                      {t("platform.lookups.field.is_active")}
                    </label>
                  </div>
                )}
              />
            </div>

            <FormField
              label={t("platform.lookups.field.metadata")}
              htmlFor="val_meta"
              error={valErrors.metadata?.message}
            >
              <Textarea
                id="val_meta"
                placeholder={t("platform.lookups.placeholder.val_metadata")}
                className="font-mono"
                spellCheck={false}
                aria-invalid={Boolean(valErrors.metadata)}
                {...registerVal("metadata")}
              />
            </FormField>

            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleValDialogOpenChange(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button type="submit" disabled={isValSubmitting || upsertValueMutation.isPending}>
                {isValSubmitting || upsertValueMutation.isPending
                  ? t("common.action.saving")
                  : t("common.action.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteCatTarget} onOpenChange={() => setDeleteCatTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("platform.lookups.delete.category_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.lookups.delete.category_description", {
                name: deleteCatTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCatDelete}
              disabled={deleteCategoryMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("platform.lookups.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteValTarget} onOpenChange={() => setDeleteValTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("platform.lookups.delete.value_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.lookups.delete.value_description", {
                name: deleteValTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleValDelete}
              disabled={deleteValueMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("platform.lookups.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 p-4">
      <PageHeader
        title={t("platform.lookups.title")}
        meta={
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
            {t("platform.lookups.count", { count: categories.length })}
          </Badge>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-muted/50 md:col-span-1">
          <div className="flex shrink-0 items-center justify-between border-b border-muted bg-muted/5 p-4">
            <span className="text-sm font-bold">{t("platform.lookups.categories.title")}</span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 px-2 text-xs font-semibold"
              onClick={openCreateCat}
            >
              <Plus className="size-3" />
              {t("platform.lookups.categories.create")}
            </Button>
          </div>

          <div className="min-h-0 flex-1 divide-y divide-muted/30 overflow-y-auto">
            {loadingCats ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {t("platform.lookups.categories.loading")}
              </div>
            ) : categories.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {t("platform.lookups.categories.empty")}
              </div>
            ) : (
              categories.map((cat) => {
                const isSelected = selectedCat?.id === cat.id
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCat(cat)}
                    className={`flex cursor-pointer items-center justify-between p-4 transition-all hover:bg-muted/10 ${
                      isSelected ? "border-r-2 border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="max-w-[70%] space-y-1">
                      <div className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        <Tag className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className={isSelected ? "text-primary" : "text-foreground"}>
                          {cat.name}
                        </span>
                      </div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">
                        {cat.code}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-6"
                        title={t("common.action.edit")}
                        onClick={(event) => openEditCat(cat, event)}
                      >
                        <Edit2 className="size-3" />
                      </Button>
                      {!cat.is_system && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-6 text-destructive"
                          title={t("common.action.delete")}
                          onClick={(event) => {
                            event.stopPropagation()
                            setDeleteCatTarget(cat)
                          }}
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                      <ChevronRight className="ml-1 size-3.5 text-muted-foreground" />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col md:col-span-2">{valuesPanel}</div>
      </div>

      {dialogs}
    </section>
  )
}
