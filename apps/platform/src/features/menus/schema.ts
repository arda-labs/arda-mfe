import { z } from "zod"
import { menuIconNames } from "@workspace/ui/config/menu-icons"
import type { PlatformMenuItem } from "./api"

export const remoteValues = [
  "",
  "shell",
  "iam",
  "platform",
  "finance",
  "account",
  "hrm",
  "workflow",
  "crm",
  "mdm",
  "loan",
  "ai",
] as const

export type TranslateFn = (
  key: string,
  params?: Record<string, string | number>
) => string

export function buildMenuSchema(t: TranslateFn) {
  return z.object({
    code: z
      .string()
      .trim()
      .min(1, t("platform.menus.validation.code_required"))
      .max(100, t("platform.menus.validation.code_too_long"))
      .regex(
        /^[a-z0-9_.]+$/,
        t("platform.menus.validation.code_format")
      ),
    title: z
      .string()
      .trim()
      .min(1, t("platform.menus.validation.title_required"))
      .max(255, t("platform.menus.validation.title_too_long")),
    path: z
      .string()
      .trim()
      .max(255, t("platform.menus.validation.path_too_long"))
      .refine(
        (value) => value === "" || value.startsWith("/"),
        t("platform.menus.validation.path_format")
      ),
    parent_code: z.string(),
    icon: z.string(),
    remote: z.string(),
    required_permission: z
      .string()
      .trim()
      .max(255, t("platform.menus.validation.permission_too_long")),
    sort_order: z
      .number()
      .int(t("platform.menus.validation.sort_integer"))
      .min(0, t("platform.menus.validation.sort_invalid")),
    is_active: z.boolean(),
  })
}

export type MenuFormValues = z.infer<ReturnType<typeof buildMenuSchema>>

export const menuDefaultValues: MenuFormValues = {
  code: "",
  title: "",
  path: "",
  parent_code: "",
  icon: "",
  remote: "",
  required_permission: "",
  sort_order: 0,
  is_active: true,
}

export function toMenuFormValues(
  item: PlatformMenuItem,
  codeById: Map<string, string>
): MenuFormValues {
  return {
    code: item.code,
    title: item.title,
    path: item.path,
    parent_code: item.parent_id
      ? (codeById.get(item.parent_id) ?? "")
      : "",
    icon: item.icon,
    remote: item.remote,
    required_permission: item.required_permission,
    sort_order: item.sort_order,
    is_active: item.is_active,
  }
}

export { menuIconNames }
