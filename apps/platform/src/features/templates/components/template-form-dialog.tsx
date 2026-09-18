import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useI18n, translateApiError } from "@workspace/i18n"
import { uploadFile } from "@workspace/media"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"
import {
  AlertCircle,
  Download,
  Eye,
  File,
  Loader2,
  Settings,
  UploadCloud,
} from "lucide-react"
import { templatesApi } from "../api"
import {
  buildTemplateSchema,
  fileTypeFromFileName,
  templateDefaultValues,
  toTemplateFormValues,
  TEMPLATE_FILE_ACCEPT,
  type TemplateFormValues,
} from "../schema"
import type { FileTemplate, TemplateFileRef } from "../types"
import { toTemplateFilePath, templateFileName } from "../urls"

interface TemplateFormDialogProps {
  open: boolean
  template: FileTemplate | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void | Promise<void>
  onPreview: (file: TemplateFileRef) => void
  onDownload: (file: TemplateFileRef) => void
}

export function TemplateFormDialog({
  open,
  template,
  onOpenChange,
  onSaved,
  onPreview,
  onDownload,
}: TemplateFormDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<{
    name: string
    size: number
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (!open) return
    setDragActive(false)
    setUploadProgress(null)
    setSelectedFile(
      template?.file_url
        ? { name: templateFileName(template), size: 0 }
        : null
    )
    reset(
      template ? toTemplateFormValues(template) : templateDefaultValues
    )
  }, [open, template, reset, t])

  const close = () => onOpenChange(false)

  const submitTemplate = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<FileTemplate> = {
        code: values.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        file_type: values.file_type.trim(),
        file_url: toTemplateFilePath(values.file_url),
        mapping_config: values.mapping_config?.trim() || undefined,
        is_active: values.is_active,
      }

      if (template) {
        await templatesApi.updateFileTemplate(template.id, payload)
        notify.success(t("platform.templates.toast.update_success"))
      } else {
        await templatesApi.createFileTemplate(payload)
        notify.success(t("platform.templates.toast.create_success"))
      }
      close()
      await onSaved()
    } catch (err) {
      notify.error(
        t("platform.templates.toast.save_failed"),
        translateApiError(err)
      )
    } finally {
      setSaving(false)
    }
  })

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
    setValue("file_type", fileTypeFromFileName(file.name), {
      shouldDirty: true,
      shouldValidate: true,
    })

    setUploadProgress(20)
    try {
      const result = await uploadFile(
        file,
        "platform",
        "file_template",
        getValues("code") || "temp_id"
      )
      setUploadProgress(100)
      setTimeout(() => {
        setUploadProgress(null)
        setValue("file_url", toTemplateFilePath(result.url), {
          shouldDirty: true,
          shouldValidate: true,
        })
        notify.success(
          t("platform.templates.upload.success", { name: file.name })
        )
      }, 300)
    } catch (err) {
      setUploadProgress(null)
      notify.error(
        t("platform.templates.upload.failed"),
        translateApiError(err)
      )
    }
  }

  const draftFileRef = (): TemplateFileRef => ({
    code: getValues("code"),
    name: getValues("name"),
    file_type: fileType,
    file_url: fileUrl,
  })

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {template
              ? t("platform.templates.edit")
              : t("platform.templates.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.templates.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <form
          autoComplete="off"
          onSubmit={submitTemplate}
          className="space-y-4 py-1.5"
        >
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
                  disabled={!!template}
                  spellCheck={false}
                  {...register("code", {
                    onChange: (event) => {
                      event.target.value = event.target.value
                        .toUpperCase()
                        .replace(/\s+/g, "_")
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

            <FormField
              label={t("platform.templates.field.file_attachment")}
              error={errors.file_url?.message}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={TEMPLATE_FILE_ACCEPT}
                onChange={handleFileChange}
              />

              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted/80 hover:bg-muted/10",
                  fileUrl ? "border-success/40 bg-muted/5" : ""
                )}
                aria-invalid={Boolean(errors.file_url)}
              >
                {uploadProgress !== null ? (
                  <div className="flex w-full max-w-xs flex-col items-center gap-2 py-2 text-center">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <span className="text-sm font-medium">
                      {t("platform.templates.upload.uploading", {
                        progress: uploadProgress,
                      })}
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
                        {selectedFile?.name ||
                          t("platform.templates.upload.template_file")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedFile?.size
                          ? formatFileSize(selectedFile.size)
                          : t("platform.templates.upload.linked")}
                      </p>
                    </div>
                    <div
                      className="flex flex-shrink-0 items-center gap-1.5"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:bg-muted/60 hover:text-primary"
                        title={t("platform.templates.action.view_file")}
                        onClick={() => onPreview(draftFileRef())}
                      >
                        <Eye className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:bg-muted/60 hover:text-primary"
                        title={t("platform.templates.action.download_file")}
                        onClick={() => onDownload(draftFileRef())}
                      >
                        <Download className="size-3.5" />
                      </Button>
                      <Badge
                        variant="outline"
                        className="border-success text-[10px] font-bold text-success uppercase"
                      >
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
                  <div
                    className="flex-1 break-all whitespace-normal"
                    title={fileUrl}
                  >
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
                <div className="flex h-9 w-fit items-center rounded-lg border border-input bg-muted/40 px-3 text-xs font-bold text-foreground uppercase">
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
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                      <label
                        htmlFor="template_is_active"
                        className="cursor-pointer text-sm font-medium select-none"
                      >
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
                placeholder={t(
                  "platform.templates.placeholder.mapping_config"
                )}
                className="h-[180px] font-mono text-xs"
                spellCheck={false}
                aria-invalid={Boolean(errors.mapping_config)}
                {...register("mapping_config")}
              />
            </FormField>
          </div>

          <div className="flex gap-2 sm:justify-end">
            <Button variant="outline" type="button" onClick={close}>
              {t("common.action.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || saving || uploadProgress !== null}
            >
              {isSubmitting || saving
                ? t("common.action.saving")
                : t("common.action.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
