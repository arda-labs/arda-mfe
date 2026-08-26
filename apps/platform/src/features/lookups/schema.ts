import { z } from "zod"
import type { LookupCategory, LookupValue } from "../api"

export const scopeTypeValues = [
  "global",
  "tenant",
  "org",
  "branch",
  "department",
] as const

export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

export function buildCategorySchema(t: TranslateFn) {
  return z
    .object({
      code: z
        .string()
        .trim()
        .min(1, t("platform.lookups.validation.code_required"))
        .max(64, t("platform.lookups.validation.code_too_long")),
      name: z
        .string()
        .trim()
        .min(1, t("platform.lookups.validation.name_required"))
        .max(255, t("platform.lookups.validation.name_too_long")),
      scope_type: z.enum(scopeTypeValues),
      scope_id: z.string().trim().optional(),
      is_system: z.boolean(),
      description: z
        .string()
        .trim()
        .max(500, t("platform.lookups.validation.description_too_long"))
        .optional(),
    })
    .superRefine((values, ctx) => {
      if (values.scope_type !== "global" && !values.scope_id?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: t("platform.lookups.validation.scope_id_required"),
          path: ["scope_id"],
        })
      }
    })
}

export function buildValueSchema(t: TranslateFn) {
  return z
    .object({
      code: z
        .string()
        .trim()
        .min(1, t("platform.lookups.validation.val_code_required"))
        .max(64, t("platform.lookups.validation.val_code_too_long")),
      name: z
        .string()
        .trim()
        .min(1, t("platform.lookups.validation.val_name_required"))
        .max(255, t("platform.lookups.validation.val_name_too_long")),
      sort_order: z
        .number()
        .int(t("platform.lookups.validation.sort_integer"))
        .min(0, t("platform.lookups.validation.sort_invalid")),
      is_active: z.boolean(),
      metadata: z.string().trim().optional(),
    })
    .superRefine((values, ctx) => {
      if (values.metadata?.trim()) {
        try {
          JSON.parse(values.metadata)
        } catch {
          ctx.addIssue({
            code: "custom",
            message: t("platform.lookups.validation.metadata_invalid"),
            path: ["metadata"],
          })
        }
      }
    })
}

export type CategoryFormValues = z.infer<ReturnType<typeof buildCategorySchema>>
export type ValueFormValues = z.infer<ReturnType<typeof buildValueSchema>>

export const categoryDefaultValues: CategoryFormValues = {
  code: "",
  name: "",
  scope_type: "global",
  scope_id: "",
  is_system: false,
  description: "",
}

export const valueDefaultValues: ValueFormValues = {
  code: "",
  name: "",
  sort_order: 10,
  is_active: true,
  metadata: "",
}

export function toCategoryFormValues(item: LookupCategory): CategoryFormValues {
  return {
    code: item.code,
    name: item.name,
    scope_type: item.scope_type,
    scope_id: item.scope_id || "",
    is_system: item.is_system,
    description: item.description || "",
  }
}

export function toValueFormValues(item: LookupValue): ValueFormValues {
  return {
    code: item.code,
    name: item.name,
    sort_order: item.sort_order,
    is_active: item.is_active,
    metadata: item.metadata || "",
  }
}
