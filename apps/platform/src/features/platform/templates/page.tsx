import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { translateApiError, useI18n } from "@workspace/i18n"
import { uploadFile } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"
import type { FileTemplate } from "../api"
import { platformApi } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Textarea } from "@workspace/ui/components/textarea"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"
import { AlertCircle, Download, Edit2, File, Link2, Loader2, Settings, Trash2, UploadCloud } from "lucide-react"
import { ListPageShell } from "@workspace/ui/admin-list/list-page-shell"
import {
  activeStatusMeta,
  matchBooleanActiveFilter,
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/ui/admin-list/column-filters"
import { sortByColumn, useClientListTable } from "@workspace/ui/admin-list/client-list"
import { ListTableToolbar } from "@workspace/ui/admin-list/list-table-toolbar"

const DEFAULT_PAGE_SIZE = 10

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

function buildTemplateSchema(t: TranslateFn) {
  return z
    .object({
      code: z
        .string()
        .trim()
        .min(1, t("platform.templates.validation.code_required"))
        .max(128, t("platform.templates.validation.code_too_long")),
      name: z
        .string()
        .trim()
        .min(1, t("platform.templates.validation.name_required"))
        .max(255, t("platform.templates.validation.name_too_long")),
      description: z
        .string()
        .trim()
        .max(500, t("platform.templates.validation.description_too_long"))
        .optional(),
      file_type: z.string().trim().min(1, t("platform.templates.validation.file_type_required")),
      file_url: z.string().trim().min(1, t("platform.templates.validation.file_url_required")),
      mapping_config: z.string().trim().optional(),
      is_active: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.mapping_config?.trim()) {
        try {
          JSON.parse(values.mapping_config)
        } catch {
          ctx.addIssue({
            code: "custom",
            message: t("platform.templates.validation.mapping_invalid"),
            path: ["mapping_config"],
          })
        }
      }
    })
}

type TemplateFormValues = z.infer<ReturnType<typeof buildTemplateSchema>>

const templateDefaultValues: TemplateFormValues = {
  code: "",
  name: "",
  description: "",
  file_type: "jrxml",
  file_url: "",
  mapping_config: '{\n  "mappings": []\n}',
  is_active: true,
}

function toTemplateFormValues(item: FileTemplate): TemplateFormValues {
  return {
    code: item.code,
    name: item.name,
    description: item.description || "",
    file_type: item.file_type,
    file_url: item.file_url,
    mapping_config: item.mapping_config || "",
    is_active: item.is_active,
  }
}

export function TemplatesPage() {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FileTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FileTemplate | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null)
  const [templates, setTemplates] = useState<FileTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadTemplates = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setLoadError(null)
    try {
      const result = await platformApi.listFileTemplates()
      setTemplates(result)
    } catch (reason) {
      setLoadError(reason)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadTemplates(true)
  }, [loadTemplates])

  const templateSchema = useMemo(() => buildTemplateSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: templateDefaultValues,
  })
  const fileType = watch("file_type")
  const fileUrl = watch("file_url")

  const openCreate = () => {
    setEditingTemplate(null)
    setSelectedFile(null)
    setUploadProgress(null)
    reset(templateDefaultValues)
    setDialogOpen(true)
  }

  const openEdit = (template: FileTemplate) => {
    setEditingTemplate(template)
    setSelectedFile(
      template.file_url
        ? { name: template.file_url.split("/").pop() || t("platform.templates.upload.template_file"), size: 0 }
        : null
    )
    setUploadProgress(null)
    reset(toTemplateFormValues(template))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingTemplate(null)
      setDragActive(false)
      setUploadProgress(null)
      setSelectedFile(null)
      reset(templateDefaultValues)
    }
  }

  const submitTemplate = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<FileTemplate> = {
        code: values.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        file_type: values.file_type.trim(),
        file_url: values.file_url.trim(),
        mapping_config: values.mapping_config?.trim() || undefined,
        is_active: values.is_active,
      }

      if (editingTemplate) {
        await platformApi.updateFileTemplate(editingTemplate.id, payload)
        notify.success("Cap nhat mau bieu thanh cong")
      } else {
        await platformApi.createFileTemplate(payload)
        notify.success("Them mau bieu thanh cong")
      }
      setDialogOpen(false)
      reset(templateDefaultValues)
      await loadTemplates()
    } catch (err) {
      notify.error("Luu mau bieu that bai", translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await platformApi.deleteFileTemplate(deleteTarget.id)
      notify.success("Xoa mau bieu thanh cong")
      setDeleteTarget(null)
      await loadTemplates()
    } catch (err) {
      notify.error("Xoa mau bieu that bai", translateApiError(err))
    } finally {
      setDeleting(false)
    }
  }

  const handleDrag = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true)
    } else if (event.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    const file = event.dataTransfer.files[0]
    if (file) {
      void processFile(file)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      void processFile(file)
    }
  }

  const processFile = async (file: File) => {
    setSelectedFile({ name: file.name, size: file.size })

    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    const matchedType = ["jrxml", "docx", "xlsx", "pdf", "html"].includes(extension) ? extension : "jrxml"
    setValue("file_type", matchedType, { shouldDirty: true, shouldValidate: true })

    setUploadProgress(20)
    try {
      const result = await uploadFile(file, "platform", "file_template", getValues("code") || "temp_id")
      setUploadProgress(100)
      setTimeout(() => {
        setUploadProgress(null)
        setValue("file_url", result.url, { shouldDirty: true, shouldValidate: true })
        notify.success(t("platform.templates.upload.success", { name: file.name }))
      }, 300)
    } catch (err) {
      setUploadProgress(null)
      notify.error(t("platform.templates.upload.failed"), translateApiError(err))
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "-"
    const k = 1024
    const sizes = [
      t("platform.templates.file_size.bytes"),
      t("platform.templates.file_size.kb"),
      t("platform.templates.file_size.mb"),
    ]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const columns = useMemo<ColumnDef<FileTemplate>[]>(
    () => [
      {
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.templates.field.code")} />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.templates.field.name")} />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("platform.templates.field.name"),
          t("platform.templates.placeholder.search")
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            {row.original.description && (
              <div className="mt-0.5 line-clamp-1 max-w-[250px] text-xs font-normal text-muted-foreground">
                {row.original.description}
              </div>
            )}
          </div>
        ),
      },
      {
        accessorKey: "file_type",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.templates.field.file_type")} />
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="text-[10px] uppercase">
            {row.original.file_type}
          </Badge>
        ),
      },
      {
        id: "file_url",
        accessorKey: "file_url",
        header: () => (
          <span className="text-xs font-semibold text-foreground/80">
            {t("platform.templates.field.file_url")}
          </span>
        ),
        cell: ({ row }) => (
          <div className="flex max-w-[300px] items-center justify-between gap-2 truncate font-mono text-xs text-muted-foreground">
            <div className="flex min-w-0 items-center gap-1">
              <Link2 className="size-3 flex-shrink-0" />
              <a
                href={row.original.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer truncate hover:text-primary hover:underline"
                title={t("platform.templates.action.view_file")}
              >
                {row.original.file_url}
              </a>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-6 flex-shrink-0 text-muted-foreground hover:text-primary"
              onClick={() => window.open(`${row.original.file_url}/download`, "_blank")}
              title={t("platform.templates.action.download_file")}
            >
              <Download className="size-3" />
            </Button>
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "is_active",
        accessorKey: "is_active",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label={t("platform.templates.field.status")} />
        ),
        enableColumnFilter: true,
        meta: activeStatusMeta(
          t("platform.templates.field.status"),
          t("platform.templates.status.active"),
          t("platform.templates.status.inactive")
        ),
        cell: ({ row }) => (
          <Status variant={row.original.is_active ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.is_active
                ? t("platform.templates.status.active")
                : t("platform.templates.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="sr-only">{t("platform.templates.field.actions")}</span>
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
    items: templates,
    filterBy: {
      name: (item, value) =>
        matchTextColumnFilter(value, item.code, item.name, item.description),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        file_type: (a, b) => a.file_type.localeCompare(b.file_type),
        is_active: (a, b) => Number(a.is_active) - Number(b.is_active),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const dialogs = (
    <>
      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate
                ? t("platform.templates.edit")
                : t("platform.templates.create_title")}
            </DialogTitle>
            <DialogDescription>{t("platform.templates.dialog_description")}</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitTemplate} className="space-y-4 py-1.5">
            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-1.5 py-1.5">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={t("platform.templates.field.code")}
                  htmlFor="template_code"
                  error={errors.code?.message}
                >
                  <Input
                    id="template_code"
                    placeholder={t("platform.templates.placeholder.code")}
                    aria-invalid={Boolean(errors.code)}
                    disabled={!!editingTemplate}
                    spellCheck={false}
                    {...register("code", {
                      onChange: (event) => {
                        event.target.value = event.target.value.toUpperCase().replace(/\s+/g, "_")
                      },
                    })}
                  />
                </FormField>
                <FormField
                  label={t("platform.templates.field.name")}
                  htmlFor="template_name"
                  error={errors.name?.message}
                >
                  <Input
                    id="template_name"
                    placeholder={t("platform.templates.placeholder.name")}
                    aria-invalid={Boolean(errors.name)}
                    spellCheck={false}
                    {...register("name")}
                  />
                </FormField>
              </div>

              <FormField
                label={t("platform.templates.field.description")}
                htmlFor="template_description"
                error={errors.description?.message}
              >
                <Textarea
                  id="template_description"
                  placeholder={t("platform.templates.placeholder.description")}
                  className="min-h-[80px] resize-y"
                  aria-invalid={Boolean(errors.description)}
                  spellCheck={false}
                  {...register("description")}
                />
              </FormField>

              <FormField label={t("platform.templates.field.file_attachment")} error={errors.file_url?.message}>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".jrxml,.docx,.xlsx,.pdf,.html"
                  onChange={handleFileChange}
                />

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileSelect}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all",
                    dragActive ? "border-primary bg-primary/5" : "border-muted/80 hover:bg-muted/10",
                    fileUrl ? "border-success/40 bg-muted/5" : ""
                  )}
                  aria-invalid={Boolean(errors.file_url)}
                >
                  {uploadProgress !== null ? (
                    <div className="flex w-full max-w-xs flex-col items-center gap-2 py-2 text-center">
                      <Loader2 className="size-8 animate-spin text-primary" />
                      <span className="text-sm font-medium">
                        {t("platform.templates.upload.uploading", { progress: uploadProgress })}
                      </span>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all duration-150"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : fileUrl ? (
                    <div className="flex w-full items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-2">
                      <File className="size-8 flex-shrink-0 text-success" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {selectedFile?.name || t("platform.templates.upload.template_file")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedFile?.size
                            ? formatFileSize(selectedFile.size)
                            : t("platform.templates.upload.linked")}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:bg-muted/60 hover:text-primary"
                          title={t("platform.templates.action.download_file")}
                          onClick={() => window.open(fileUrl, "_blank")}
                        >
                          <Download className="size-3.5" />
                        </Button>
                        <Badge variant="outline" className="border-success text-[10px] font-bold uppercase text-success">
                          {fileType}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="size-8 text-muted-foreground" />
                      <p className="text-center text-sm font-semibold text-foreground">
                        {t("platform.templates.upload.drag_drop")}
                      </p>
                      <p className="text-center text-xs text-muted-foreground">
                        {t("platform.templates.upload.supported_formats")}
                      </p>
                    </>
                  )}
                </div>

                {fileUrl && !uploadProgress && (
                  <div className="mt-1.5 flex w-full items-start gap-1.5 px-1 font-mono text-[11px] text-muted-foreground">
                    <AlertCircle className="mt-0.5 size-3 flex-shrink-0 text-success" />
                    <div className="flex-1 break-all whitespace-normal" title={fileUrl}>
                      <span className="font-semibold text-foreground">
                        {t("platform.templates.upload.s3_link")}:{" "}
                      </span>
                      {fileUrl}
                    </div>
                  </div>
                )}
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label={t("platform.templates.field.file_type")}>
                  <div className="flex h-9 w-fit items-center rounded-lg border border-input bg-muted/40 px-3 text-xs font-bold uppercase text-foreground">
                    {fileType || t("platform.templates.upload.unrecognized")}
                  </div>
                </FormField>

                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <div className="flex items-end pb-2.5">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="template_is_active"
                          checked={field.value}
                          onCheckedChange={(checked) => field.onChange(checked === true)}
                        />
                        <label htmlFor="template_is_active" className="cursor-pointer select-none text-sm font-medium">
                          {t("platform.templates.field.is_active")}
                        </label>
                      </div>
                    </div>
                  )}
                />
              </div>

              <FormField
                label={t("platform.templates.field.mapping_config")}
                htmlFor="template_mapping_config"
                error={errors.mapping_config?.message}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <Settings className="size-3.5 text-muted-foreground" />
                </div>
                <Textarea
                  id="template_mapping_config"
                  placeholder={t("platform.templates.placeholder.mapping_config")}
                  className="h-[180px] font-mono text-xs"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.mapping_config)}
                  {...register("mapping_config")}
                />
              </FormField>
            </div>

            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleDialogOpenChange(false)}>
                {t("common.action.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  saving ||
                  uploadProgress !== null
                }
              >
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
            <AlertDialogTitle>{t("platform.templates.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.templates.delete.description", { name: deleteTarget?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("platform.templates.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )

  return (
    <ListPageShell
      title={t("platform.templates.title")}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.templates.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadTemplates}
      loadErrorTitle={t("platform.templates.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("platform.templates.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
