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
import { ChevronDown } from "lucide-react"
import { knowledgeApi, type VersionCreate } from "../api"

const contentTypes = ["markdown", "url", "file"] as const

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

  const schema = useMemo(() => buildSchema(t), [t])
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })

  const contentType = watch("content_type")

  const handleOpenChange = (next: boolean) => {
    if (!next) reset(defaultValues)
    onOpenChange(next)
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
        content:
          values.content_type === "markdown"
            ? values.content || null
            : null,
        content_url:
          values.content_type === "markdown" ? null : values.content_url || null,
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
      <DialogContent className="sm:max-w-lg">
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
                  <Select value={field.value} onValueChange={field.onChange}>
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

          {contentType === "markdown" ? (
            <FormField
              label={t("platform.knowledge.field.content")}
              htmlFor="kv_content"
              error={errors.content?.message}
            >
              <Textarea
                id="kv_content"
                rows={8}
                aria-invalid={Boolean(errors.content)}
                spellCheck={false}
                placeholder={t("platform.knowledge.placeholder.content")}
                {...register("content")}
              />
            </FormField>
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
            <Button type="submit" disabled={saving}>
              {saving ? t("common.action.saving") : t("common.action.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
