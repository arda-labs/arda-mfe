import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { LookupCategory } from "../../api"
import { platformApi } from "../../api"
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
import {
  buildCategorySchema,
  categoryDefaultValues,
  scopeTypeValues,
  toCategoryFormValues,
  type CategoryFormValues,
} from "../schema"

export function CategoryDialog({
  open,
  onOpenChange,
  editingCat,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCat: LookupCategory | null
  onSuccess: () => Promise<void>
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)

  const categorySchema = useMemo(() => buildCategorySchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    values: editingCat ? toCategoryFormValues(editingCat) : categoryDefaultValues,
  })

  const catScopeType = watch("scope_type")

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) reset(categoryDefaultValues)
  }

  const submitCategory = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<LookupCategory> = {
        code: values.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: values.name.trim(),
        scope_type: values.scope_type,
        scope_id: values.scope_id?.trim() || undefined,
        description: values.description?.trim() || undefined,
        is_system: values.is_system,
      }
      if (editingCat) {
        payload.id = editingCat.id
      }
      await platformApi.upsertLookupCategory(payload)
      notify.success("Lưu danh mục thành công")
      handleClose(false)
      await onSuccess()
    } catch (err) {
      notify.error("Lưu danh mục thất bại", translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingCat
              ? t("platform.lookups.category.edit")
              : t("platform.lookups.category.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.lookups.category.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <form
          autoComplete="off"
          onSubmit={submitCategory}
          className="space-y-4 py-2"
        >
          <FormField
            label={t("platform.lookups.field.code")}
            htmlFor="cat_code"
            error={errors.code?.message}
          >
            <Input
              id="cat_code"
              placeholder={t("platform.lookups.placeholder.cat_code")}
              aria-invalid={Boolean(errors.code)}
              disabled={!!editingCat}
              className="font-mono uppercase"
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
            label={t("platform.lookups.field.name")}
            htmlFor="cat_name"
            error={errors.name?.message}
          >
            <Input
              id="cat_name"
              placeholder={t("platform.lookups.placeholder.cat_name")}
              aria-invalid={Boolean(errors.name)}
              spellCheck={false}
              {...register("name")}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.lookups.field.scope_type")}
              htmlFor="cat_scope_type"
              error={errors.scope_type?.message}
            >
              <Controller
                control={control}
                name="scope_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value)
                      setValue("scope_id", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  >
                    <SelectTrigger
                      id="cat_scope_type"
                      aria-invalid={Boolean(errors.scope_type)}
                    >
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
                error={errors.scope_id?.message}
              >
                <Input
                  id="cat_scope_id"
                  placeholder={t("platform.lookups.placeholder.scope_id")}
                  aria-invalid={Boolean(errors.scope_id)}
                  spellCheck={false}
                  {...register("scope_id")}
                />
              </FormField>
            )}
          </div>
          <FormField
            label={t("platform.lookups.field.description")}
            htmlFor="cat_description"
            error={errors.description?.message}
          >
            <Input
              id="cat_description"
              placeholder={t("platform.lookups.placeholder.cat_description")}
              aria-invalid={Boolean(errors.description)}
              spellCheck={false}
              {...register("description")}
            />
          </FormField>

          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleClose(false)}
            >
              {t("common.action.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || saving}
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
