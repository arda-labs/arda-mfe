import { z } from "zod"
import type { SavingsProduct } from "../api"

export const buildProductSchema = (t: (key: string) => string) =>
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

export type ProductFormValues = z.infer<ReturnType<typeof buildProductSchema>>

export const productDefaultValues: ProductFormValues = {
  code: "",
  name: "",
  term_months: 12,
  interest_rate: 5,
  currency_code: "VND",
}

export function toProductValues(product: SavingsProduct): ProductFormValues {
  return {
    code: product.code,
    name: product.name,
    term_months: product.term_months,
    interest_rate: product.interest_rate,
    currency_code: product.currency_code,
  }
}
