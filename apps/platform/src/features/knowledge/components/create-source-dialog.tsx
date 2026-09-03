import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
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
import { knowledgeApi, type SourceCreate } from "../api"

const sourceTypes = ["docs", "admin", "url"] as const
const sourceScopes = ["tenant", "global", "system"] as const

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

function buildSchema(t: TranslateFn) {
  return z
    .object({
      title: z
        .string()
        .trim()
        .min(1, t("platform.knowledge.validation.title_required"))
        .max(500, t("platform.knowledge.validation.title_too_long")),
      description: z.string().max(2000).optional().or(z.literal("")),
      source_type: z.enum(sourceTypes),
      scope: z.enum(sourceScopes),
      language: z.string().max(16).optional().or(z.literal("")),
      tags: z.string().max(500).optional().or(z.literal("")),
      effective_from: z.string().optional().or(z.literal("")),
      effective_to: z.string().optional().or(z.literal("")),
    })
    .refine(
      // Both fields are datetime-local "YYYY-MM-DDTHH:mm" — fixed-width ISO,
      // so lexicographic comparison is equivalent to chronological.
      (v) =>
        !v.effective_from ||
        !v.effective_to ||
        v.effective_to > v.effective_from,
      {
        path: ["effective_to"],
        message: t("platform.knowledge.validation.effective_range_invalid"),
      }
    )
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>

const defaultValues: FormValues = {
  title: "",
  description: "",
  source_type: "docs",
  scope: "tenant",
  language: "vi",
  tags: "",
  effective_from: "",
  effective_to: "",
}

export function CreateSourceDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues })

  const handleOpenChange = (next: boolean) => {
    if (!next) reset(defaultValues)
    onOpenChange(next)
  }

  const submit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: SourceCreate = {
        title: values.title.trim(),
        description: values.description || null,
        source_type: values.source_type,
        scope: values.scope,
        language: values.language || "vi",
        tags: (values.tags ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        // Send datetime-local value as-is (local time, no UTC shift). The
        // rag-service accepts this ISO format directly.
        effective_from: values.effective_from || null,
        effective_to: values.effective_to || null,
      }
      await knowledgeApi.createSource(payload)
      notify.success(t("platform.knowledge.toast.create_success"))
      handleOpenChange(false)
      await onSuccess()
    } catch (err) {
      notify.error(
        t("platform.knowledge.toast.create_failed"),
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
          <DialogTitle>{t("platform.knowledge.create_source_title")}</DialogTitle>
          <DialogDescription>
            {t("platform.knowledge.create_source_description")}
          </DialogDescription>
        </DialogHeader>

        <form
          autoComplete="off"
          onSubmit={submit}
          className="space-y-4 py-2"
        >
          <FormField
            label={t("platform.knowledge.field.title")}
            htmlFor="ks_title"
            error={errors.title?.message}
          >
            <Input
              id="ks_title"
              placeholder={t("platform.knowledge.placeholder.title")}
              aria-invalid={Boolean(errors.title)}
              spellCheck={false}
              {...register("title")}
            />
          </FormField>

          <FormField
            label={t("platform.knowledge.field.description")}
            htmlFor="ks_description"
            error={errors.description?.message}
          >
            <Input
              id="ks_description"
              aria-invalid={Boolean(errors.description)}
              spellCheck={false}
              {...register("description")}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.knowledge.field.source_type")}
              error={errors.source_type?.message}
            >
              <Controller
                control={control}
                name="source_type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label={t("platform.knowledge.field.source_type")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`platform.knowledge.source_type.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField
              label={t("platform.knowledge.field.scope")}
              error={errors.scope?.message}
            >
              <Controller
                control={control}
                name="scope"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-label={t("platform.knowledge.field.scope")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceScopes.map((scope) => (
                        <SelectItem key={scope} value={scope}>
                          {t(`platform.knowledge.scope.${scope}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.knowledge.field.language")}
              htmlFor="ks_language"
              error={errors.language?.message}
            >
              <Input
                id="ks_language"
                placeholder={t("platform.knowledge.placeholder.language")}
                aria-invalid={Boolean(errors.language)}
                spellCheck={false}
                {...register("language")}
              />
            </FormField>

            <FormField
              label={t("platform.knowledge.field.tags")}
              htmlFor="ks_tags"
              error={errors.tags?.message}
            >
              <Input
                id="ks_tags"
                placeholder={t("platform.knowledge.placeholder.tags")}
                aria-invalid={Boolean(errors.tags)}
                spellCheck={false}
                {...register("tags")}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.knowledge.field.effective_from")}
              htmlFor="ks_effective_from"
              error={errors.effective_from?.message}
            >
              <Input
                id="ks_effective_from"
                type="datetime-local"
                aria-invalid={Boolean(errors.effective_from)}
                {...register("effective_from")}
              />
            </FormField>

            <FormField
              label={t("platform.knowledge.field.effective_to")}
              htmlFor="ks_effective_to"
              error={errors.effective_to?.message}
            >
              <Input
                id="ks_effective_to"
                type="datetime-local"
                aria-invalid={Boolean(errors.effective_to)}
                {...register("effective_to")}
              />
            </FormField>
          </div>

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
