import { z } from "zod"
import type { FileTemplate } from "./types"

export const TEMPLATE_FILE_TYPES = [
  "jrxml",
  "docx",
  "xlsx",
  "pdf",
  "html",
] as const

export const TEMPLATE_FILE_ACCEPT = TEMPLATE_FILE_TYPES.map(
  (type) => `.${type}`
).join(",")

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

export function buildTemplateSchema(t: TranslateFn) {
  return z
    .object({
      code: z
        .string()
        .trim()
        .min(1, t("platform.templates.validation.code_required"))
        .max(128, t("platform.templates.validation.code_too_long")),
      name: z
        .string()
        .trim()
        .min(1, t("platform.templates.validation.name_required"))
        .max(255, t("platform.templates.validation.name_too_long")),
      description: z
        .string()
        .trim()
        .max(500, t("platform.templates.validation.description_too_long"))
        .optional(),
      file_type: z
        .string()
        .trim()
        .min(1, t("platform.templates.validation.file_type_required")),
      file_url: z
        .string()
        .trim()
        .min(1, t("platform.templates.validation.file_url_required")),
      mapping_config: z.string().trim().optional(),
      is_active: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.mapping_config?.trim()) {
        try {
          JSON.parse(values.mapping_config)
        } catch {
          ctx.addIssue({
            code: "custom",
            message: t("platform.templates.validation.mapping_invalid"),
            path: ["mapping_config"],
          })
        }
      }
    })
}

export type TemplateFormValues = z.infer<
  ReturnType<typeof buildTemplateSchema>
>

export const templateDefaultValues: TemplateFormValues = {
  code: "",
  name: "",
  description: "",
  file_type: "jrxml",
  file_url: "",
  mapping_config: '{\n  "mappings": []\n}',
  is_active: true,
}

export function toTemplateFormValues(item: FileTemplate): TemplateFormValues {
  return {
    code: item.code,
    name: item.name,
    description: item.description || "",
    file_type: item.file_type,
    file_url: item.file_url,
    mapping_config: item.mapping_config || "",
    is_active: item.is_active,
  }
}

/** Maps an uploaded filename to the supported template file types. */
export function fileTypeFromFileName(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase() || ""
  return (TEMPLATE_FILE_TYPES as readonly string[]).includes(extension)
    ? extension
    : "jrxml"
}
