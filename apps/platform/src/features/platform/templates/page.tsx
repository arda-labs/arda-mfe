import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError } from "@workspace/i18n"
import { uploadFile } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"
import type { FileTemplate } from "../api"
import {
  useCreateFileTemplate,
  useDeleteFileTemplate,
  useFileTemplates,
  useUpdateFileTemplate,
} from "./queries"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"
import { AlertCircle, Download, Edit2, File, Link2, Loader2, Plus, Settings, Trash2, UploadCloud } from "lucide-react"

const templateFormSchema = z
  .object({
    code: z.string().trim().min(1, "Ma mau bieu la bat buoc").max(128, "Ma mau bieu qua dai"),
    name: z.string().trim().min(1, "Ten mau bieu la bat buoc").max(255, "Ten mau bieu qua dai"),
    description: z.string().trim().max(500, "Mo ta qua dai").optional(),
    file_type: z.string().trim().min(1, "Dinh dang file la bat buoc"),
    file_url: z.string().trim().min(1, "Tep bieu mau la bat buoc"),
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
          message: "Mapping JSON khong hop le",
          path: ["mapping_config"],
        })
      }
    }
  })

type TemplateFormValues = z.infer<typeof templateFormSchema>

const templateDefaultValues: TemplateFormValues = {
  code: "",
  name: "",
  description: "",
  file_type: "jrxml",
  file_url: "",
  mapping_config: "{\n  \"mappings\": []\n}",
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FileTemplate | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FileTemplate | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const templatesQuery = useFileTemplates()
  const createMutation = useCreateFileTemplate()
  const updateMutation = useUpdateFileTemplate()
  const deleteMutation = useDeleteFileTemplate()
  const templates = templatesQuery.data ?? []
  const loading = templatesQuery.isLoading
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
    resolver: zodResolver(templateFormSchema),
    defaultValues: templateDefaultValues,
  })
  const fileType = watch("file_type")
  const fileUrl = watch("file_url")

  useEffect(() => {
    if (templatesQuery.error) {
      notify.error("Khong the tai danh sach mau bieu", translateApiError(templatesQuery.error))
    }
  }, [templatesQuery.error])

  const openCreate = () => {
    setEditingTemplate(null)
    setSelectedFile(null)
    setUploadProgress(null)
    reset(templateDefaultValues)
    setDialogOpen(true)
  }

  const openEdit = (template: FileTemplate) => {
    setEditingTemplate(template)
    setSelectedFile(template.file_url ? { name: template.file_url.split("/").pop() || "Template File", size: 0 } : null)
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
        await updateMutation.mutateAsync({ id: editingTemplate.id, payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      setDialogOpen(false)
      reset(templateDefaultValues)
    } catch {
      // Mutation hook owns the toast.
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // Mutation hook owns the toast.
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
      processFile(file)
    }
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
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
        notify.success(`Da tai file ${file.name} len media-service thanh cong`)
      }, 300)
    } catch (err) {
      setUploadProgress(null)
      notify.error("Tai file that bai", translateApiError(err))
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "-"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Mau bieu he thong (Templates)</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
            Tong so: {templates.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 text-sm font-semibold">
          <Plus className="size-4" /> Them mau bieu
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Dang tai du lieu mau bieu...
        </div>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-muted/50 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px]">Ma mau</TableHead>
                  <TableHead>Ten mau bieu</TableHead>
                  <TableHead className="w-[120px]">Dinh dang</TableHead>
                  <TableHead>Duong dan file (Storage / S3)</TableHead>
                  <TableHead className="w-[120px]">Trang thai</TableHead>
                  <TableHead className="w-[100px] text-right">Thao tac</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Chua co mau bieu nao duoc cau hinh.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-mono text-xs font-bold">{template.code}</TableCell>
                      <TableCell className="font-medium">
                        <div>{template.name}</div>
                        {template.description && (
                          <div className="mt-0.5 line-clamp-1 max-w-[250px] text-xs font-normal text-muted-foreground">
                            {template.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {template.file_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate font-mono text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1">
                            <Link2 className="size-3 flex-shrink-0" />
                            <a
                              href={template.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="cursor-pointer truncate hover:text-primary hover:underline"
                              title="Xem tep tin mau"
                            >
                              {template.file_url}
                            </a>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6 flex-shrink-0 text-muted-foreground hover:text-primary"
                            onClick={() => window.open(`${template.file_url}/download`, "_blank")}
                            title="Tai xuong tep tin mau"
                          >
                            <Download className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Status variant={template.is_active ? "success" : "default"}>
                          <StatusIndicator />
                          <StatusLabel>{template.is_active ? "Hoat dong" : "Tam ngung"}</StatusLabel>
                        </Status>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(template)}>
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget(template)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? "Cap nhat mau bieu" : "Them mau bieu moi"}</DialogTitle>
            <DialogDescription>Tai file bieu mau va cau hinh so do du lieu mapping JSON chi tiet.</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitTemplate} className="space-y-4 py-1.5">
            <div className="max-h-[60vh] space-y-4 overflow-y-auto px-1.5 py-1.5">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Ma mau bieu" htmlFor="template_code" error={errors.code?.message}>
                  <Input
                    id="template_code"
                    placeholder="CONTRACT_TEMPL_V1"
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
                <FormField label="Ten mau bieu" htmlFor="template_name" error={errors.name?.message}>
                  <Input
                    id="template_name"
                    placeholder="Hop dong tin dung mau"
                    aria-invalid={Boolean(errors.name)}
                    spellCheck={false}
                    {...register("name")}
                  />
                </FormField>
              </div>

              <FormField label="Mo ta mau bieu" htmlFor="template_description" error={errors.description?.message}>
                <Textarea
                  id="template_description"
                  placeholder="Mo ta cong dung hoac pham vi cua mau bieu..."
                  className="min-h-[80px] resize-y"
                  aria-invalid={Boolean(errors.description)}
                  spellCheck={false}
                  {...register("description")}
                />
              </FormField>

              <FormField label="Tep bieu mau dinh kem" error={errors.file_url?.message}>
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
                      <span className="text-sm font-medium">Dang tai file len media-service... ({uploadProgress}%)</span>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  ) : fileUrl ? (
                    <div className="flex w-full items-center gap-3 rounded-lg border border-success/20 bg-success/5 p-2">
                      <File className="size-8 flex-shrink-0 text-success" />
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-semibold text-foreground">{selectedFile?.name || "Template File"}</p>
                        <p className="text-xs text-muted-foreground">{selectedFile?.size ? formatFileSize(selectedFile.size) : "Da lien ket"}</p>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:bg-muted/60 hover:text-primary"
                          title="Tai xuong tep tin mau"
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
                      <p className="text-center text-sm font-semibold text-foreground">Keo tha file vao day hoac click de chon file</p>
                      <p className="text-center text-xs text-muted-foreground">Ho tro: .jrxml, .docx, .xlsx, .pdf, .html</p>
                    </>
                  )}
                </div>

                {fileUrl && !uploadProgress && (
                  <div className="mt-1.5 flex w-full items-start gap-1.5 px-1 font-mono text-[11px] text-muted-foreground">
                    <AlertCircle className="mt-0.5 size-3 flex-shrink-0 text-success" />
                    <div className="flex-1 break-all whitespace-normal" title={fileUrl}>
                      <span className="font-semibold text-foreground">S3 Link: </span>
                      {fileUrl}
                    </div>
                  </div>
                )}
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Dinh dang file">
                  <div className="flex h-9 w-fit items-center rounded-lg border border-input bg-muted/40 px-3 text-xs font-bold uppercase text-foreground">
                    {fileType || "Chua nhan dien"}
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
                          Mau bieu dang hoat dong
                        </label>
                      </div>
                    </div>
                  )}
                />
              </div>

              <FormField label="Cau hinh Mapping (JSON)" htmlFor="template_mapping_config" error={errors.mapping_config?.message}>
                <div className="mb-1 flex items-center gap-1.5">
                  <Settings className="size-3.5 text-muted-foreground" />
                </div>
                <Textarea
                  id="template_mapping_config"
                  placeholder='{\n  "mappings": []\n}'
                  className="h-[180px] font-mono text-xs"
                  spellCheck={false}
                  aria-invalid={Boolean(errors.mapping_config)}
                  {...register("mapping_config")}
                />
              </FormField>
            </div>

            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleDialogOpenChange(false)}>
                Huy
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending || updateMutation.isPending || uploadProgress !== null}
              >
                {isSubmitting ? "Dang luu..." : "Luu lai"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xac nhan xoa mau bieu?</AlertDialogTitle>
            <AlertDialogDescription>
              Hanh dong nay se xoa vinh vien cau hinh mau bieu <strong>{deleteTarget?.name}</strong> khoi danh sach quan ly. Duong dan file goc tren Storage khong bi anh huong.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xoa bo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
