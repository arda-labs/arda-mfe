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
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { depositApi } from "../../api"
import type { SavingsProduct } from "../../api"
import {
  buildProductSchema,
  productDefaultValues,
  toProductValues,
  type ProductFormValues,
} from "../schema"

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
        {
          product_code: values.code.trim(),
          name: values.name.trim(),
          term_months: values.term_months,
          interest_rate: values.interest_rate,
          currency_code: values.currency_code.trim().toUpperCase(),
        }
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
          <Button className="w-full" type="submit" disabled={isSubmitting || saving}>
            {t("deposit.products.submit_request")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
