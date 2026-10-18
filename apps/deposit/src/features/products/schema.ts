import { z } from "zod"
import type { ProductUpsertRequest, SavingsProduct } from "../api"
import { isRoundType, parseRoundNo } from "./round-config"

export const buildProductSchema = (t: (key: string) => string) =>
  z
    .object({
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
      // Kept as text so an empty box ("not configured") differs from 0.
      round_no: z.string(),
      round_type: z.string(),
    })
    .superRefine((value, ctx) => {
      const step = parseRoundNo(value.round_no)
      const kind = value.round_type.trim()
      if (!step.ok) {
        ctx.addIssue({
          code: "custom",
          path: ["round_no"],
          message: t("deposit.products.validation.round_no_invalid"),
        })
      }
      if (kind !== "" && !isRoundType(kind)) {
        ctx.addIssue({
          code: "custom",
          path: ["round_type"],
          message: t("deposit.products.validation.round_type_invalid"),
        })
      }
      // Both or neither: a half-filled pair is rejected by the API and the table.
      if (step.ok && step.value === null && kind !== "" && isRoundType(kind)) {
        ctx.addIssue({
          code: "custom",
          path: ["round_no"],
          message: t("deposit.products.validation.round_no_required"),
        })
      }
      if (step.ok && step.value !== null && kind === "") {
        ctx.addIssue({
          code: "custom",
          path: ["round_type"],
          message: t("deposit.products.validation.round_type_required"),
        })
      }
    })

export type ProductFormValues = z.infer<ReturnType<typeof buildProductSchema>>

export const productDefaultValues: ProductFormValues = {
  code: "",
  name: "",
  term_months: 12,
  interest_rate: 5,
  currency_code: "VND",
  // No default on purpose: an empty pair means "not configured".
  round_no: "",
  round_type: "",
}

export function toProductValues(product: SavingsProduct): ProductFormValues {
  return {
    code: product.code,
    name: product.name,
    term_months: product.term_months,
    interest_rate: product.interest_rate,
    currency_code: product.currency_code,
    round_no: product.round_no == null ? "" : String(product.round_no),
    round_type: product.round_type ?? "",
  }
}

/**
 * Body of the register/edit request. The rounding pair is sent only when both
 * halves are set (round_no 0 counts); omitted on an edit it leaves the stored
 * configuration unchanged.
 */
export function toRequestBody(values: ProductFormValues): ProductUpsertRequest {
  const step = parseRoundNo(values.round_no)
  const kind = values.round_type.trim()
  const body: ProductUpsertRequest = {
    product_code: values.code.trim(),
    name: values.name.trim(),
    term_months: values.term_months,
    interest_rate: values.interest_rate,
    currency_code: values.currency_code.trim().toUpperCase(),
  }
  if (step.ok && step.value !== null && isRoundType(kind)) {
    body.round_no = step.value
    body.round_type = kind
  }
  return body
}
