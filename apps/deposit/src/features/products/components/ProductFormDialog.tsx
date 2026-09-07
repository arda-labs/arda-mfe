import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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

const buildProductSchema = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("deposit.validation.code_required"))
      .max(64, t("deposit.validation.code_too_long")),
    name: z
      .string()
      .trim()
      .min(1, t("deposit.validation.name_required"))
      .max(255, t("deposit.validation.name_too_long")),
    term_months: z
      .number({ error: t("deposit.products.validation.term_number") })
      .int(t("deposit.products.validation.term_integer"))
      .min(1, t("deposit.products.validation.term_positive"))
      .max(600, t("deposit.products.validation.term_too_long")),
    interest_rate: z
      .number({ error: t("deposit.products.validation.rate_number") })
      .min(0, t("deposit.products.validation.rate_non_negative"))
      .max(100, t("deposit.products.validation.rate_too_high")),
    currency_code: z
      .string()
      .trim()
      .length(3, t("deposit.validation.currency_length")),
  })

type ProductFormValues = z.infer<ReturnType<typeof buildProductSchema>>

const productDefaultValues: ProductFormValues = {
  code: "",
  name: "",
  term_months: 12,
  interest_rate: 5,
  currency_code: "VND",
}

function toProductValues(product: SavingsProduct): ProductFormValues {
  return {
    code: product.code,
    name: product.name,
    term_months: product.term_months,
    interest_rate: product.interest_rate,
    currency_code: product.currency_code,
  }
}

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
      await depositApi.upsertProduct({
        code: values.code.trim(),
        name: values.name.trim(),
        term_months: values.term_months,
        interest_rate: values.interest_rate,
        currency_code: values.currency_code.trim().toUpperCase(),
      })
      notify.success(
        product
          ? t("deposit.products.update_success")
          : t("deposit.products.create_success")
      )
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(
        t("deposit.products.save_failed"),
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
            {product ? t("common.action.save") : t("common.action.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
