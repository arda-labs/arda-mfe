import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import type { GeoAdminUnit } from "../api"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { MaskInput } from "@workspace/ui/components/mask-input"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Edit2 } from "lucide-react"
import { ListPageShell } from "../shared/list-page-shell"
import {
  activeStatusMeta,
  getSingleSelectValue,
  matchBooleanActiveFilter,
  matchStringFieldFilter,
  matchTextColumnFilter,
  selectFilterMeta,
  textSearchMeta,
  useColumnFilterParams,
} from "../shared/column-filters"
import { sortByColumn, useClientListTable } from "../shared/client-list"
import { ListTableToolbar } from "../shared/list-table-toolbar"
import { useUpsertWard, useWardProvinces, useWards } from "./queries"

const DEFAULT_PAGE_SIZE = 10

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function buildWardSchema(t: TranslateFn) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, t("platform.wards.validation.code_required"))
      .max(32, t("platform.wards.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("platform.wards.validation.name_required"))
      .max(255, t("platform.wards.validation.name_too_long")),
    full_name: z
      .string()
      .trim()
      .max(255, t("platform.wards.validation.full_name_too_long"))
      .optional(),
    parent_code: z.string().trim().min(1, t("platform.wards.validation.parent_required")),
    unit_type: z
      .string()
      .trim()
      .min(1, t("platform.wards.validation.unit_type_required"))
      .max(64, t("platform.wards.validation.unit_type_too_long")),
    country_code: z
      .string()
      .trim()
      .min(1, t("platform.wards.validation.country_code_required"))
      .max(8, t("platform.wards.validation.country_code_too_long")),
    region_code: z
      .string()
      .trim()
      .max(32, t("platform.wards.validation.region_code_too_long"))
      .optional(),
    effective_from: z.string().trim().optional(),
    effective_to: z.string().trim().optional(),
  })
}

type WardFormValues = z.infer<ReturnType<typeof buildWardSchema>>

const wardDefaultValues: WardFormValues = {
  code: "",
  name: "",
  full_name: "",
  parent_code: "",
  unit_type: "ward",
  country_code: "VN",
  region_code: "",
  effective_from: "",
  effective_to: "",
}

function toWardFormValues(item: GeoAdminUnit): WardFormValues {
  return {
    code: item.code,
    name: item.name,
    full_name: item.full_name || "",
    parent_code: item.parent_code || "",
    unit_type: item.unit_type || "ward",
    country_code: item.country_code || "VN",
    region_code: item.region_code || "",
    effective_from: item.effective_from || "",
    effective_to: item.effective_to || "",
  }
}

export function WardsPage() {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GeoAdminUnit | null>(null)

  const provincesQuery = useWardProvinces()
  const wardsQuery = useWards("all")
  const upsertWard = useUpsertWard(Boolean(editingItem))
  const provinces = provincesQuery.data ?? []
  const items = wardsQuery.data ?? []
  const loading = provincesQuery.isLoading || wardsQuery.isLoading

  const provinceNameByCode = useMemo(
    () => Object.fromEntries(provinces.map((province) => [province.code, province.name])),
    [provinces]
  )

  const wardSchema = useMemo(() => buildWardSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<WardFormValues>({
    resolver: zodResolver(wardSchema),
    defaultValues: wardDefaultValues,
  })

  useEffect(() => {
    const error = provincesQuery.error || wardsQuery.error
    if (error) {
      notify.error(t("platform.wards.load_failed"), translateApiError(error))
    }
  }, [provincesQuery.error, t, wardsQuery.error])

  const openEdit = (item: GeoAdminUnit) => {
    setEditingItem(item)
    reset(toWardFormValues(item))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingItem(null)
      reset(wardDefaultValues)
    }
  }

  const submitWard = handleSubmit(async (values) => {
    try {
      await upsertWard.mutateAsync({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        full_name: values.full_name?.trim() || undefined,
        parent_code: values.parent_code,
        level: 2,
        unit_type: values.unit_type.trim(),
        country_code: values.country_code.trim().toUpperCase() || "VN",
        region_code: values.region_code?.trim() || undefined,
        effective_from: values.effective_from || undefined,
        effective_to: values.effective_to || undefined,
        is_active: true,
      })
      setDialogOpen(false)
      reset(wardDefaultValues)
    } catch {
      // Mutation hook already shows the save error toast.
    }
  })

  const columns = useMemo<ColumnDef<GeoAdminUnit>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.wards.field.code")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.wards.field.name")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.wards.field.name"),
          t("platform.wards.placeholder.search")
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.name}</div>
            {row.original.full_name ? (
              <div className="text-xs text-muted-foreground">{row.original.full_name}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: "parent_code",
        accessorKey: "parent_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.wards.field.parent")} />
        ),
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("platform.wards.field.parent"),
          provinces.map((province) => ({ label: province.name, value: province.code }))
        ),
        cell: ({ row }) =>
          provinceNameByCode[row.original.parent_code ?? ""] ||
          row.original.parent_code ||
          "-",
      },
      {
        accessorKey: "unit_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.wards.field.unit_type")} />
        ),
      },
      {
        accessorKey: "country_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.wards.field.country_code")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.country_code}</span>
        ),
      },
      {
        accessorKey: "region_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.wards.field.region_code")} />
        ),
        cell: ({ row }) => row.original.region_code || "-",
      },
      {
        accessorKey: "effective_from",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.wards.field.effective_from")} />
        ),
        cell: ({ row }) => row.original.effective_from || "-",
      },
      {
        accessorKey: "effective_to",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.wards.field.effective_to")} />
        ),
        cell: ({ row }) => row.original.effective_to || "-",
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.wards.field.status")} />
        ),
        enableColumnFilter: true,
        meta: activeStatusMeta(
          t("platform.wards.field.status"),
          t("platform.wards.status.active"),
          t("platform.wards.status.inactive")
        ),
        cell: ({ row }) => (
          <Status variant={row.original.is_active ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.is_active
                ? t("platform.wards.status.active")
                : t("platform.wards.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => <span className="sr-only">{t("platform.wards.field.actions")}</span>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => openEdit(row.original)}
            >
              <Edit2 className="size-3.5" />
            </Button>
          </div>
        ),
        enableSorting: false,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [provinceNameByCode, provinces, t]
  )

  const [filterValues] = useColumnFilterParams(columns)

  const openCreate = () => {
    setEditingItem(null)
    reset({
      ...wardDefaultValues,
      parent_code: getSingleSelectValue(filterValues.parent_code) || "",
    })
    setDialogOpen(true)
  }

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      name: (item, value) =>
        matchTextColumnFilter(value, item.code, item.name, item.full_name),
      parent_code: (item, value) =>
        matchStringFieldFilter(item.parent_code ?? "", value),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        full_name: (a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""),
        parent_code: (a, b) => (a.parent_code ?? "").localeCompare(b.parent_code ?? ""),
        unit_type: (a, b) => a.unit_type.localeCompare(b.unit_type),
        country_code: (a, b) => a.country_code.localeCompare(b.country_code),
        region_code: (a, b) => (a.region_code ?? "").localeCompare(b.region_code ?? ""),
        effective_from: (a, b) =>
          (a.effective_from ?? "").localeCompare(b.effective_from ?? ""),
        effective_to: (a, b) => (a.effective_to ?? "").localeCompare(b.effective_to ?? ""),
        is_active: (a, b) => Number(a.is_active) - Number(b.is_active),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const dialogs = (
    <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? t("platform.wards.edit") : t("platform.wards.create_title")}
          </DialogTitle>
          <DialogDescription>{t("platform.wards.dialog_description")}</DialogDescription>
        </DialogHeader>
        <form autoComplete="off" onSubmit={submitWard} className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={t("platform.wards.field.code")}
              htmlFor="ward_code"
              error={errors.code?.message}
            >
              <Input
                id="ward_code"
                aria-invalid={Boolean(errors.code)}
                disabled={!!editingItem}
                {...register("code")}
              />
            </FormField>
            <FormField
              label={t("platform.wards.field.name")}
              htmlFor="ward_name"
              error={errors.name?.message}
            >
              <Input id="ward_name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              className="md:col-span-2"
              label={t("platform.wards.field.full_name")}
              htmlFor="ward_full_name"
              error={errors.full_name?.message}
            >
              <Input
                id="ward_full_name"
                aria-invalid={Boolean(errors.full_name)}
                {...register("full_name")}
              />
            </FormField>
            <FormField
              label={t("platform.wards.field.parent")}
              htmlFor="ward_parent"
              error={errors.parent_code?.message}
            >
              <Controller
                control={control}
                name="parent_code"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="ward_parent" aria-invalid={Boolean(errors.parent_code)}>
                      <SelectValue placeholder={t("platform.wards.placeholder.parent")} />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((province) => (
                        <SelectItem key={province.code} value={province.code}>
                          {province.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <FormField
              label={t("platform.wards.field.unit_type")}
              htmlFor="ward_unit_type"
              error={errors.unit_type?.message}
            >
              <Input
                id="ward_unit_type"
                aria-invalid={Boolean(errors.unit_type)}
                {...register("unit_type")}
              />
            </FormField>
            <FormField
              label={t("platform.wards.field.region_code")}
              htmlFor="ward_region_code"
              error={errors.region_code?.message}
            >
              <Input
                id="ward_region_code"
                aria-invalid={Boolean(errors.region_code)}
                {...register("region_code")}
              />
            </FormField>
            <FormField
              label={t("platform.wards.field.effective_from")}
              htmlFor="ward_effective_from"
              error={errors.effective_from?.message}
            >
              <Controller
                control={control}
                name="effective_from"
                render={({ field }) => (
                  <MaskInput
                    id="ward_effective_from"
                    mask="date"
                    className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </FormField>
            <FormField
              label={t("platform.wards.field.effective_to")}
              htmlFor="ward_effective_to"
              error={errors.effective_to?.message}
            >
              <Controller
                control={control}
                name="effective_to"
                render={({ field }) => (
                  <MaskInput
                    id="ward_effective_to"
                    mask="date"
                    className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                    value={field.value || ""}
                    onValueChange={field.onChange}
                  />
                )}
              />
            </FormField>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" type="button" onClick={() => handleDialogOpenChange(false)}>
              {t("common.action.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || upsertWard.isPending}>
              {isSubmitting || upsertWard.isPending ? t("common.action.saving") : t("common.action.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )

  return (
    <ListPageShell
      title={t("platform.wards.title")}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.wards.count", { count: total })}
        </Badge>
      }
      loading={loading}
      isEmpty={items.length === 0}
      skeletonColumns={10}
      skeletonFilters={3}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("platform.wards.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
