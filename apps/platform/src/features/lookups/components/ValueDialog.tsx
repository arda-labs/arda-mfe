import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { LookupCategory, LookupValue } from "../../api"
import { platformApi } from "../../api"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  buildValueSchema,
  toValueFormValues,
  valueDefaultValues,
  type ValueFormValues,
} from "../schema"

export function ValueDialog({
  open,
  onOpenChange,
  editingVal,
  selectedCat,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingVal: LookupValue | null
  selectedCat: LookupCategory | null
  onSuccess: () => Promise<void>
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)

  const valueSchema = useMemo(() => buildValueSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ValueFormValues>({
    resolver: zodResolver(valueSchema),
    values: editingVal ? toValueFormValues(editingVal) : valueDefaultValues,
  })

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) reset(valueDefaultValues)
  }

  const submitValue = handleSubmit(async (values) => {
    if (!selectedCat) return
    setSaving(true)
    try {
      const payload: Partial<LookupValue> = {
        code: values.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: values.name.trim(),
        sort_order: Number(values.sort_order),
        is_active: values.is_active,
        metadata: values.metadata?.trim() || undefined,
      }
      if (editingVal) {
        payload.id = editingVal.id
      }
      await platformApi.upsertLookupValue(selectedCat.code, payload)
      notify.success("Lưu giá trị thành công")
      handleClose(false)
      await onSuccess()
    } catch (err) {
      notify.error("Lưu giá trị thất bại", translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingVal
              ? t("platform.lookups.value.edit")
              : t("platform.lookups.value.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.lookups.value.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <form
          autoComplete="off"
          onSubmit={submitValue}
          className="space-y-4 py-2"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.lookups.field.code")}
              htmlFor="val_code"
              error={errors.code?.message}
            >
              <Input
                id="val_code"
                placeholder={t("platform.lookups.placeholder.val_code")}
                aria-invalid={Boolean(errors.code)}
                disabled={!!editingVal}
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
              htmlFor="val_name"
              error={errors.name?.message}
            >
              <Input
                id="val_name"
                placeholder={t("platform.lookups.placeholder.val_name")}
                aria-invalid={Boolean(errors.name)}
                spellCheck={false}
                {...register("name")}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.lookups.field.sort_order")}
              htmlFor="val_sort"
              error={errors.sort_order?.message}
            >
              <Input
                id="val_sort"
                type="number"
                aria-invalid={Boolean(errors.sort_order)}
                {...register("sort_order", { valueAsNumber: true })}
              />
            </FormField>
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="val_active"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                  <label
                    htmlFor="val_active"
                    className="cursor-pointer text-sm font-medium select-none"
                  >
                    {t("platform.lookups.field.is_active")}
                  </label>
                </div>
              )}
            />
          </div>

          <FormField
            label={t("platform.lookups.field.metadata")}
            htmlFor="val_meta"
            error={errors.metadata?.message}
          >
            <Textarea
              id="val_meta"
              placeholder={t("platform.lookups.placeholder.val_metadata")}
              className="font-mono"
              spellCheck={false}
              aria-invalid={Boolean(errors.metadata)}
              {...register("metadata")}
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
