import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { SelectField } from "@workspace/ui/components/select-field"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { depositApi } from "../../api"
import type { SavingsProduct } from "../../api"
import {
  buildProductSchema,
  productDefaultValues,
  toProductValues,
  toRequestBody,
  type ProductFormValues,
} from "../schema"
import { ROUND_TYPES, roundTypeLabelKey } from "../round-config"

interface ProductFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Present when editing an existing product; null for create. */
  product: SavingsProduct | null
  /** Called after a successful save so the page can refresh its server list. */
  onSaved?: () => void | Promise<void>
}

/** Create/edit dialog for the product catalog (BE upsert by tenant+code). */
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: ProductFormDialogProps) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const productSchema = useMemo(() => buildProductSchema(t), [t])
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: productDefaultValues,
  })

  useEffect(() => {
    if (open) reset(product ? toProductValues(product) : productDefaultValues)
  }, [product, open, reset])

  const submit = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const submission = await depositApi.submitProductRequest(
        product ? "EDIT" : "REGISTER",
        toRequestBody(values)
      )
      notify.success(t("deposit.products.request_success"), submission.case_code)
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(
        t("deposit.products.request_failed"),
        translateApiError(err, t("deposit.save_failed"))
      )
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {product ? t("deposit.products.edit") : t("deposit.products.create")}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <FormField label={t("common.field.code")} error={errors.code?.message}>
            <Input
              aria-invalid={Boolean(errors.code)}
              disabled={Boolean(product)}
              className="font-mono"
              {...register("code")}
            />
          </FormField>
          <FormField label={t("common.field.name")} error={errors.name?.message}>
            <Input aria-invalid={Boolean(errors.name)} {...register("name")} />
          </FormField>
          <FormField
            label={t("deposit.products.field.term_months")}
            error={errors.term_months?.message}
          >
            <Input
              type="number"
              aria-invalid={Boolean(errors.term_months)}
              {...register("term_months", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label={t("deposit.products.field.interest_rate")}
            error={errors.interest_rate?.message}
          >
            <Input
              type="number"
              step="0.01"
              aria-invalid={Boolean(errors.interest_rate)}
              {...register("interest_rate", { valueAsNumber: true })}
            />
          </FormField>
          <FormField
            label={t("common.field.currency")}
            error={errors.currency_code?.message}
          >
            <Input
              aria-invalid={Boolean(errors.currency_code)}
              maxLength={3}
              className="font-mono uppercase"
              {...register("currency_code", {
                onChange: (event) => {
                  event.target.value = event.target.value.toUpperCase()
                },
              })}
            />
          </FormField>
          <FormField
            label={t("deposit.products.field.round_no")}
            error={errors.round_no?.message}
            description={t("deposit.products.field.round_no_hint")}
          >
            <Input
              inputMode="numeric"
              autoComplete="off"
              aria-invalid={Boolean(errors.round_no)}
              className="font-mono"
              {...register("round_no")}
            />
          </FormField>
          <FormField
            label={t("deposit.products.field.round_type")}
            error={errors.round_type?.message}
            description={
              product
                ? t("deposit.products.field.round_type_hint_edit")
                : t("deposit.products.field.round_type_hint")
            }
          >
            <SelectField
              aria-invalid={Boolean(errors.round_type)}
              placeholder={t("deposit.products.round_type.unset")}
              searchable={false}
              options={ROUND_TYPES.map((code) => ({
                value: code,
                code,
                label: t(roundTypeLabelKey(code) ?? code),
              }))}
              {...register("round_type")}
            />
          </FormField>
          <Button className="w-full" type="submit" disabled={isSubmitting || saving}>
            {t("deposit.products.submit_request")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
