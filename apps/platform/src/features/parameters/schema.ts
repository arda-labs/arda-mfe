import { z } from "zod"
import type { Parameter } from "../api"

export const valueTypeValues = ["string", "number", "boolean", "json", "date"] as const
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

export function buildParameterSchema(t: TranslateFn) {
  return z
    .object({
      key: z
        .string()
        .trim()
        .min(1, t("platform.parameters.validation.key_required"))
        .max(128, t("platform.parameters.validation.key_too_long")),
      value: z.string(),
      value_type: z.enum(valueTypeValues),
      scope_type: z.enum(scopeTypeValues),
      scope_id: z.string().trim().optional(),
      description: z
        .string()
        .trim()
        .max(500, t("platform.parameters.validation.description_too_long"))
        .optional(),
      is_secret: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (!values.is_secret && !values.value.trim()) {
        ctx.addIssue({
          code: "custom",
          message: t("platform.parameters.validation.value_required"),
          path: ["value"],
        })
      }
      if (values.scope_type !== "global" && !values.scope_id?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: t("platform.parameters.validation.scope_id_required"),
          path: ["scope_id"],
        })
      }
      if (
        values.value_type === "number" &&
        values.value.trim() &&
        !Number.isFinite(Number(values.value))
      ) {
        ctx.addIssue({
          code: "custom",
          message: t("platform.parameters.validation.number_invalid"),
          path: ["value"],
        })
      }
      if (values.value_type === "json" && values.value.trim()) {
        try {
          JSON.parse(values.value)
        } catch {
          ctx.addIssue({
            code: "custom",
            message: t("platform.parameters.validation.json_invalid"),
            path: ["value"],
          })
        }
      }
    })
}

export type ParameterFormValues = z.infer<ReturnType<typeof buildParameterSchema>>

export const parameterDefaultValues: ParameterFormValues = {
  key: "",
  value: "",
  value_type: "string",
  scope_type: "global",
  scope_id: "",
  description: "",
  is_secret: false,
}

export function toParameterFormValues(item: Parameter): ParameterFormValues {
  return {
    key: item.key,
    value: item.value,
    value_type: item.value_type,
    scope_type: item.scope_type,
    scope_id: item.scope_id || "",
    description: item.description || "",
    is_secret: item.is_secret,
  }
}
