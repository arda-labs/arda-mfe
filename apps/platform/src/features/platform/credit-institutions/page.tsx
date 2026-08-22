import { useCallback, useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import type { CreditInstitution } from "../api"
import { platformApi } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { MaskInput } from "@workspace/ui/components/mask-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { Edit2, Trash2 } from "lucide-react"
import { ListPageShell } from "@workspace/ui/admin-list/list-page-shell"
import {
  matchSelectFilter,
  matchTextColumnFilter,
  multiSelectFilterMeta,
  textSearchMeta,
} from "@workspace/ui/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/ui/admin-list/client-list"
import { ListTableToolbar } from "@workspace/ui/admin-list/list-table-toolbar"

const DEFAULT_PAGE_SIZE = 10

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function buildCreditInstitutionSchema(t: TranslateFn) {
  const optionalEmailSchema = z.union([
    z.literal(""),
    z.string().trim().email(t("platform.credit_institutions.validation.email_invalid")),
  ])

  const optionalUrlSchema = z.union([
    z.literal(""),
    z.string().trim().url(t("platform.credit_institutions.validation.website_invalid")),
  ])

  return z.object({
    code: z
      .string()
      .trim()
      .min(1, t("platform.credit_institutions.validation.code_required"))
      .max(64, t("platform.credit_institutions.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("platform.credit_institutions.validation.name_required"))
      .max(255, t("platform.credit_institutions.validation.name_too_long")),
    address: z
      .string()
      .trim()
      .min(1, t("platform.credit_institutions.validation.address_required"))
      .max(500, t("platform.credit_institutions.validation.address_too_long")),
    status: z.enum(["active", "inactive"]),
    effective_from: z.string().trim().optional(),
    short_name: z
      .string()
      .trim()
      .max(128, t("platform.credit_institutions.validation.short_name_too_long"))
      .optional(),
    phone: z
      .string()
      .trim()
      .max(32, t("platform.credit_institutions.validation.phone_too_long"))
      .optional(),
    email: optionalEmailSchema,
    license_no: z
      .string()
      .trim()
      .max(128, t("platform.credit_institutions.validation.license_no_too_long"))
      .optional(),
    license_date: z.string().trim().optional(),
    tax_code: z
      .string()
      .trim()
      .max(64, t("platform.credit_institutions.validation.tax_code_too_long"))
      .optional(),
    website: optionalUrlSchema,
    note: z
      .string()
      .trim()
      .max(500, t("platform.credit_institutions.validation.note_too_long"))
      .optional(),
  })
}

type CreditInstitutionFormValues = z.infer<ReturnType<typeof buildCreditInstitutionSchema>>

const creditInstitutionDefaultValues: CreditInstitutionFormValues = {
  code: "",
  name: "",
  address: "",
  status: "active",
  effective_from: "",
  short_name: "",
  phone: "",
  email: "",
  license_no: "",
  license_date: "",
  tax_code: "",
  website: "",
  note: "",
}

function toCreditInstitutionFormValues(item: CreditInstitution): CreditInstitutionFormValues {
  return {
    code: item.code,
    name: item.name,
    address: item.address,
    status: item.status,
    effective_from: item.effective_from || "",
    short_name: item.short_name || "",
    phone: item.phone || "",
    email: item.email || "",
    license_no: item.license_no || "",
    license_date: item.license_date || "",
    tax_code: item.tax_code || "",
    website: item.website || "",
    note: item.note || "",
  }
}

export function CreditInstitutionsPage() {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CreditInstitution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CreditInstitution | null>(null)
  const [items, setItems] = useState<CreditInstitution[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadCreditInstitutions = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await platformApi.listCreditInstitutions()
      setItems(result)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadCreditInstitutions(true)
  }, [loadCreditInstitutions])

  const creditInstitutionSchema = useMemo(() => buildCreditInstitutionSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreditInstitutionFormValues>({
    resolver: zodResolver(creditInstitutionSchema),
    defaultValues: creditInstitutionDefaultValues,
  })

  const openCreate = () => {
    setEditingItem(null)
    reset(creditInstitutionDefaultValues)
    setDialogOpen(true)
  }

  const openEdit = (item: CreditInstitution) => {
    setEditingItem(item)
    reset(toCreditInstitutionFormValues(item))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingItem(null)
      reset(creditInstitutionDefaultValues)
    }
  }

  const submitCreditInstitution = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<CreditInstitution> = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        address: values.address.trim(),
        status: values.status,
        effective_from: values.effective_from || undefined,
        short_name: values.short_name?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email.trim() || undefined,
        license_no: values.license_no?.trim() || undefined,
        license_date: values.license_date || undefined,
        tax_code: values.tax_code?.trim() || undefined,
        website: values.website.trim() || undefined,
        note: values.note?.trim() || undefined,
      }

      if (editingItem) {
        await platformApi.updateCreditInstitution(editingItem.id, payload)
        notify.success("Cap nhat to chuc tin dung thanh cong")
      } else {
        await platformApi.createCreditInstitution(payload)
        notify.success("Them to chuc tin dung thanh cong")
      }

      setDialogOpen(false)
      reset(creditInstitutionDefaultValues)
      await loadCreditInstitutions()
    } catch (err) {
      notify.error("Luu to chuc tin dung that bai", translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await platformApi.deleteCreditInstitution(deleteTarget.id)
      notify.success("Xoa to chuc tin dung thanh cong")
      setDeleteTarget(null)
      await loadCreditInstitutions()
    } catch (err) {
      notify.error("Xoa to chuc tin dung that bai", translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const columns = useMemo<ColumnDef<CreditInstitution>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.credit_institutions.field.code")} />
        ),
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.credit_institutions.field.name")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.credit_institutions.field.name"),
          t("platform.credit_institutions.placeholder.search")
        ),
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.address}</div>
          </div>
        ),
      },
      {
        accessorKey: "short_name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.short_name")}
          />
        ),
        cell: ({ row }) => row.original.short_name || "-",
      },
      {
        accessorKey: "license_no",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.license_no")}
          />
        ),
        cell: ({ row }) => row.original.license_no || "-",
      },
      {
        accessorKey: "tax_code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.credit_institutions.field.tax_code")} />
        ),
        cell: ({ row }) => row.original.tax_code || "-",
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.credit_institutions.field.status")} />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("platform.credit_institutions.field.status"), [
          { label: t("platform.credit_institutions.status.active"), value: "active" },
          { label: t("platform.credit_institutions.status.inactive"), value: "inactive" },
        ]),
        cell: ({ row }) => (
          <Status variant={row.original.status === "active" ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.status === "active"
                ? t("platform.credit_institutions.status.active")
                : t("platform.credit_institutions.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        accessorKey: "effective_from",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("platform.credit_institutions.field.effective_from")}
          />
        ),
        cell: ({ row }) => row.original.effective_from || "-",
      },
      {
        id: "actions",
        header: () => (
          <span className="sr-only">{t("platform.credit_institutions.field.actions")}</span>
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
      },
    ],
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items,
    filterBy: {
      name: (item, value) => matchTextColumnFilter(value, item.code, item.name),
      status: (item, value) => matchSelectFilter(item.status, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        short_name: (a, b) => (a.short_name ?? "").localeCompare(b.short_name ?? ""),
        license_no: (a, b) => (a.license_no ?? "").localeCompare(b.license_no ?? ""),
        tax_code: (a, b) => (a.tax_code ?? "").localeCompare(b.tax_code ?? ""),
        status: (a, b) => a.status.localeCompare(b.status),
        effective_from: (a, b) => (a.effective_from ?? "").localeCompare(b.effective_from ?? ""),
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
                ? t("platform.credit_institutions.edit")
                : t("platform.credit_institutions.create_title")}
            </DialogTitle>
            <DialogDescription>
              {t("platform.credit_institutions.dialog_description")}
            </DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitCreditInstitution} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label={t("platform.credit_institutions.field.code")}
                htmlFor="credit_code"
                error={errors.code?.message}
              >
                <Input
                  id="credit_code"
                  placeholder={t("platform.credit_institutions.placeholder.code")}
                  aria-invalid={Boolean(errors.code)}
                  disabled={!!editingItem}
                  {...register("code")}
                />
              </FormField>
              <FormField
                label={t("platform.credit_institutions.field.name")}
                htmlFor="credit_name"
                error={errors.name?.message}
              >
                <Input
                  id="credit_name"
                  placeholder={t("platform.credit_institutions.placeholder.name")}
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label={t("platform.credit_institutions.field.address")}
                htmlFor="credit_address"
                error={errors.address?.message}
              >
                <Input
                  id="credit_address"
                  placeholder={t("platform.credit_institutions.placeholder.address")}
                  aria-invalid={Boolean(errors.address)}
                  {...register("address")}
                />
              </FormField>
              <FormField
                label={t("platform.credit_institutions.field.status")}
                htmlFor="credit_status"
                error={errors.status?.message}
              >
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="credit_status" aria-invalid={Boolean(errors.status)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">
                          {t("platform.credit_institutions.status.active")}
                        </SelectItem>
                        <SelectItem value="inactive">
                          {t("platform.credit_institutions.status.inactive")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                label={t("platform.credit_institutions.field.effective_from")}
                htmlFor="credit_effective_from"
                error={errors.effective_from?.message}
              >
                <Controller
                  control={control}
                  name="effective_from"
                  render={({ field }) => (
                    <MaskInput
                      id="credit_effective_from"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
              <FormField
                label={t("platform.credit_institutions.field.short_name")}
                htmlFor="credit_short_name"
                error={errors.short_name?.message}
              >
                <Input id="credit_short_name" aria-invalid={Boolean(errors.short_name)} {...register("short_name")} />
              </FormField>
              <FormField
                label={t("platform.credit_institutions.field.phone")}
                htmlFor="credit_phone"
                error={errors.phone?.message}
              >
                <Input id="credit_phone" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                label={t("platform.credit_institutions.field.email")}
                htmlFor="credit_email"
                error={errors.email?.message}
              >
                <Input id="credit_email" type="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
              </FormField>
              <FormField
                label={t("platform.credit_institutions.field.license_no")}
                htmlFor="credit_license_no"
                error={errors.license_no?.message}
              >
                <Input id="credit_license_no" aria-invalid={Boolean(errors.license_no)} {...register("license_no")} />
              </FormField>
              <FormField
                label={t("platform.credit_institutions.field.license_date")}
                htmlFor="credit_license_date"
                error={errors.license_date?.message}
              >
                <Controller
                  control={control}
                  name="license_date"
                  render={({ field }) => (
                    <MaskInput
                      id="credit_license_date"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                label={t("platform.credit_institutions.field.tax_code")}
                htmlFor="credit_tax_code"
                error={errors.tax_code?.message}
              >
                <Input id="credit_tax_code" aria-invalid={Boolean(errors.tax_code)} {...register("tax_code")} />
              </FormField>
              <FormField
                className="md:col-span-2"
                label={t("platform.credit_institutions.field.website")}
                htmlFor="credit_website"
                error={errors.website?.message}
              >
                <Input id="credit_website" type="url" aria-invalid={Boolean(errors.website)} {...register("website")} />
              </FormField>
            </div>

            <FormField
              label={t("platform.credit_institutions.field.note")}
              htmlFor="credit_note"
              error={errors.note?.message}
            >
              <Textarea
                id="credit_note"
                placeholder={t("platform.credit_institutions.placeholder.note")}
                aria-invalid={Boolean(errors.note)}
                {...register("note")}
              />
            </FormField>

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
            <AlertDialogTitle>{t("platform.credit_institutions.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.credit_institutions.delete.description", {
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
              {t("platform.credit_institutions.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <ListPageShell
      title={t("platform.credit_institutions.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.credit_institutions.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadCreditInstitutions}
      loadErrorTitle={t("platform.credit_institutions.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("platform.credit_institutions.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
