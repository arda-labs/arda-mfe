import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Badge } from "@workspace/ui/components/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { ChevronDown, Eye, FileText, Layers, RefreshCw } from "lucide-react"
import { uploadFile } from "@workspace/media"
import { knowledgeApi, type ChunkPreviewOut, type VersionCreate } from "../api"
import { ChunkPreviewPanel } from "./chunk-preview-panel"
import { FileUploadZone } from "./file-upload-zone"

const contentTypes = ["markdown", "file", "url"] as const

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

function buildSchema(t: TranslateFn) {
  return z.object({
    version: z
      .string()
      .trim()
      .min(1, t("platform.knowledge.validation.version_required"))
      .max(128, t("platform.knowledge.validation.version_too_long")),
    content_type: z.enum(contentTypes),
    content: z.string().optional().or(z.literal("")),
    content_url: z.string().optional().or(z.literal("")),
    strategy: z.string().optional().or(z.literal("")),
    chunk_size: z.string().optional().or(z.literal("")),
    chunk_overlap: z.string().optional().or(z.literal("")),
  })
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>

const defaultValues: FormValues = {
  version: "",
  content_type: "markdown",
  content: "",
  content_url: "",
  strategy: "",
  chunk_size: "",
  chunk_overlap: "",
}

export function CreateVersionDialog({
  open,
  onOpenChange,
  sourceId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceId: number
  onSuccess: () => Promise<void>
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileProcessing, setFileProcessing] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [previewChunks, setPreviewChunks] = useState<ChunkPreviewOut[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")

  const schema = useMemo(() => buildSchema(t), [t])
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })

  const contentType = watch("content_type")
  const watchContent = watch("content")
  const watchChunkSize = watch("chunk_size")
  const watchChunkOverlap = watch("chunk_overlap")

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      reset(defaultValues)
      setSelectedFile(null)
      setPreviewChunks([])
      setFileError(null)
      setActiveTab("edit")
    }
    onOpenChange(next)
  }

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file)
    setFileProcessing(true)
    setFileError(null)

    const chunkSize = watchChunkSize ? Number(watchChunkSize) : 512
    const chunkOverlap = watchChunkOverlap ? Number(watchChunkOverlap) : 64

    try {
      // 1. Parse document & get live preview
      const previewRes = await knowledgeApi.parseAndPreviewFile(
        file,
        chunkSize,
        chunkOverlap
      )
      if (previewRes.extracted_text) {
        setValue("content", previewRes.extracted_text)
      }
      setPreviewChunks(previewRes.chunks)
      setActiveTab("preview")

      // 2. Upload to media-service in background
      try {
        const mediaRes = await uploadFile(
          file,
          "knowledge",
          "source_version",
          String(sourceId),
          "private"
        )
        if (mediaRes.url) {
          setValue("content_url", mediaRes.url)
        }
      } catch (mediaErr) {
        // Non-blocking: media upload failed, but extracted text is still intact
        console.warn("Media service upload skipped/failed:", mediaErr)
      }
    } catch (err) {
      setFileError(err instanceof Error ? err.message : String(err))
      notify.error(
        t("platform.knowledge.upload.parse_failed"),
        translateApiError(err)
      )
    } finally {
      setFileProcessing(false)
    }
  }

  const handleFileRemove = () => {
    setSelectedFile(null)
    setFileError(null)
    setValue("content", "")
    setValue("content_url", "")
    setPreviewChunks([])
    setActiveTab("edit")
  }

  const handlePreviewMarkdown = async () => {
    const text = watchContent?.trim()
    if (!text) {
      notify.error(t("platform.knowledge.validation.content_required_for_preview"))
      return
    }

    setPreviewLoading(true)
    try {
      const chunkSize = watchChunkSize ? Number(watchChunkSize) : 512
      const chunkOverlap = watchChunkOverlap ? Number(watchChunkOverlap) : 64
      const res = await knowledgeApi.previewChunks({
        content: text,
        chunker_config: {
          chunk_size: chunkSize,
          chunk_overlap: chunkOverlap,
        },
      })
      setPreviewChunks(res.chunks)
      setActiveTab("preview")
    } catch (err) {
      notify.error(
        t("platform.knowledge.preview.failed"),
        translateApiError(err)
      )
    } finally {
      setPreviewLoading(false)
    }
  }

  const submit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const chunkSize = values.chunk_size
        ? Number(values.chunk_size)
        : undefined
      const chunkOverlap = values.chunk_overlap
        ? Number(values.chunk_overlap)
        : undefined

      const payload: VersionCreate = {
        version: values.version.trim(),
        content_type: values.content_type,
        content: values.content || null,
        content_url: values.content_url || null,
        chunker_config:
          values.strategy || chunkSize || chunkOverlap
            ? {
                strategy: values.strategy || undefined,
                chunk_size: chunkSize,
                chunk_overlap: chunkOverlap,
              }
            : null,
      }
      await knowledgeApi.createVersion(sourceId, payload)
      notify.success(t("platform.knowledge.toast.version_create_success"))
      handleOpenChange(false)
      await onSuccess()
    } catch (err) {
      notify.error(
        t("platform.knowledge.toast.version_create_failed"),
        translateApiError(err)
      )
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("platform.knowledge.new_version")}</DialogTitle>
          <DialogDescription>
            {t("platform.knowledge.create_version_description")}
          </DialogDescription>
        </DialogHeader>

        <form autoComplete="off" onSubmit={submit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.knowledge.field.version")}
              htmlFor="kv_version"
              error={errors.version?.message}
            >
              <Input
                id="kv_version"
                placeholder={t("platform.knowledge.placeholder.version")}
                aria-invalid={Boolean(errors.version)}
                spellCheck={false}
                {...register("version")}
              />
            </FormField>

            <FormField
              label={t("platform.knowledge.field.content_type")}
              error={errors.content_type?.message}
            >
              <Controller
                control={control}
                name="content_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val)
                      setPreviewChunks([])
                    }}
                  >
                    <SelectTrigger aria-label={t("platform.knowledge.field.content_type")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {contentTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`platform.knowledge.content_type.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          {contentType === "file" ? (
            <div className="space-y-3">
              <FormField label={t("platform.knowledge.field.upload_file")}>
                <FileUploadZone
                  file={selectedFile}
                  onFileSelect={(f) => void handleFileSelect(f)}
                  onFileRemove={handleFileRemove}
                  uploading={fileProcessing}
                  error={fileError}
                />
              </FormField>

              {watchContent ? (
                <div className="flex items-center justify-between border-b pb-1">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={activeTab === "preview" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setActiveTab("preview")}
                    >
                      <Layers className="mr-1 size-3.5" />
                      {t("platform.knowledge.tab.preview_chunks")}
                      {previewChunks.length > 0 ? (
                        <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px]">
                          {previewChunks.length}
                        </Badge>
                      ) : null}
                    </Button>
                    <Button
                      type="button"
                      variant={activeTab === "edit" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setActiveTab("edit")}
                    >
                      <FileText className="mr-1 size-3.5" />
                      {t("platform.knowledge.tab.extracted_markdown")}
                    </Button>
                  </div>

                  {activeTab === "preview" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={previewLoading || fileProcessing}
                      onClick={() => void handlePreviewMarkdown()}
                    >
                      <RefreshCw className="mr-1 size-3" />
                      {t("platform.knowledge.preview.refresh")}
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {activeTab === "preview" && watchContent ? (
                <ChunkPreviewPanel
                  chunks={previewChunks}
                  loading={previewLoading || fileProcessing}
                />
              ) : null}

              {activeTab === "edit" || !previewChunks.length ? (
                <FormField
                  label={t("platform.knowledge.field.content")}
                  htmlFor="kv_content"
                  error={errors.content?.message}
                >
                  <Textarea
                    id="kv_content"
                    rows={6}
                    aria-invalid={Boolean(errors.content)}
                    spellCheck={false}
                    placeholder={t("platform.knowledge.placeholder.content")}
                    {...register("content")}
                  />
                </FormField>
              ) : null}
            </div>
          ) : contentType === "markdown" ? (
            <div className="space-y-3">
              <FormField
                label={t("platform.knowledge.field.content")}
                htmlFor="kv_content"
                error={errors.content?.message}
              >
                <Textarea
                  id="kv_content"
                  rows={7}
                  aria-invalid={Boolean(errors.content)}
                  spellCheck={false}
                  placeholder={t("platform.knowledge.placeholder.content")}
                  {...register("content")}
                />
              </FormField>

              <div className="flex justify-between items-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  disabled={previewLoading || !watchContent?.trim()}
                  onClick={() => void handlePreviewMarkdown()}
                >
                  <Eye className="mr-1.5 size-3.5" />
                  {t("platform.knowledge.preview.generate_btn")}
                </Button>
                {previewChunks.length > 0 ? (
                  <Badge variant="secondary" className="text-xs font-mono">
                    {previewChunks.length} chunks
                  </Badge>
                ) : null}
              </div>

              {previewChunks.length > 0 ? (
                <ChunkPreviewPanel
                  chunks={previewChunks}
                  loading={previewLoading}
                />
              ) : null}
            </div>
          ) : (
            <FormField
              label={t("platform.knowledge.field.content_url")}
              htmlFor="kv_content_url"
              error={errors.content_url?.message}
            >
              <Input
                id="kv_content_url"
                aria-invalid={Boolean(errors.content_url)}
                spellCheck={false}
                placeholder={t("platform.knowledge.placeholder.content_url")}
                {...register("content_url")}
              />
            </FormField>
          )}

          <Collapsible className="rounded-lg border border-muted/70 bg-muted/20">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-foreground/80 transition-colors hover:bg-accent/40 [&[data-state=open]>svg]:rotate-180">
              {t("platform.knowledge.chunker_title")}
              <Badge variant="outline" className="text-[10px] font-normal">
                {t("platform.knowledge.advanced")}
              </Badge>
              <ChevronDown className="size-3.5 text-muted-foreground transition-transform" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 border-t border-muted/70 p-3">
              <FormField
                label={t("platform.knowledge.field.strategy")}
                htmlFor="kv_strategy"
                error={errors.strategy?.message}
              >
                <Input
                  id="kv_strategy"
                  placeholder={t("platform.knowledge.placeholder.strategy")}
                  spellCheck={false}
                  {...register("strategy")}
                />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  label={t("platform.knowledge.field.chunk_size")}
                  htmlFor="kv_chunk_size"
                  error={errors.chunk_size?.message}
                >
                  <Input
                    id="kv_chunk_size"
                    type="number"
                    placeholder={t("platform.knowledge.placeholder.chunk_size")}
                    {...register("chunk_size")}
                  />
                </FormField>
                <FormField
                  label={t("platform.knowledge.field.chunk_overlap")}
                  htmlFor="kv_chunk_overlap"
                  error={errors.chunk_overlap?.message}
                >
                  <Input
                    id="kv_chunk_overlap"
                    type="number"
                    placeholder={t("platform.knowledge.placeholder.chunk_overlap")}
                    {...register("chunk_overlap")}
                  />
                </FormField>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleOpenChange(false)}
            >
              {t("common.action.cancel")}
            </Button>
            <Button type="submit" disabled={saving || fileProcessing}>
              {saving ? t("common.action.saving") : t("common.action.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
