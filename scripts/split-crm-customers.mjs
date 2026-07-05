/**
 * Split customer-module.tsx into feature folders.
 * Run: bun scripts/split-crm-customers.mjs && bun scripts/prepend-crm-customers.mjs
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { join } from "node:path"

const dir = join(import.meta.dir, "../apps/crm/src/features/customers")
const src = join(dir, "shared/customer-module.tsx")
const backup = join(dir, "shared/customer-module.backup.tsx")
let raw
try {
  raw = readFileSync(src, "utf8")
  copyFileSync(src, backup)
} catch {
  raw = readFileSync(backup, "utf8")
}
const lines = raw.split("\n")

const exportFn = (body) => body.replace(/^function /gm, "export function ")

mkdirSync(join(dir, "shared"), { recursive: true })
mkdirSync(join(dir, "components"), { recursive: true })
mkdirSync(join(dir, "pages"), { recursive: true })

// --- schemas.ts (lines 64-284, 1-indexed) ---
writeFileSync(
  join(dir, "shared/schemas.ts"),
  `import { z } from "zod"

${lines
  .slice(63, 284)
  .join("\n")
  .replace(/^const customerSchema/, "export const customerSchema")
  .replace(/^type CustomerFormValues/, "export type CustomerFormValues")
  .replace(/^const relationshipSchema/, "export const relationshipSchema")
  .replace(/^type RelationshipFormValues/, "export type RelationshipFormValues")
  .replace(/^const defaultValues/, "export const defaultValues")
  .replace(/^const selectOptions/, "export const selectOptions")
  .replace(/^const generalFieldsPrimary/, "export const generalFieldsPrimary")
  .replace(/^const generalFieldsRest/, "export const generalFieldsRest")
  .replace(/^const personalFields/, "export const personalFields")
  .replace(/^const extendedFields/, "export const extendedFields")
  .replace(/^const businessFields/, "export const businessFields")}
`
)

// --- form-utils.ts ---
writeFileSync(
  join(dir, "shared/form-utils.ts"),
  `import type { Customer, CustomerPayload, CustomerType } from "../api"
import {
  defaultValues,
  selectOptions,
  type CustomerFormValues,
} from "./schemas"

${exportFn(lines.slice(1456, 1645).join("\n"))}

${exportFn(lines.slice(1813).join("\n"))}
`
)

// --- task-context.ts (no JSX) ---
writeFileSync(
  join(dir, "shared/task-context.ts"),
  `import { notify } from "@workspace/notifications/notify"
import { navigateTo } from "@workspace/core/routing"
import { customerApi, type Customer, type WorkflowTaskRole } from "../api"

${lines
  .slice(1646, 1771)
  .join("\n")
  .replace(/^type CustomerTaskContext/, "export type CustomerTaskContext")
  .replace(/^function /gm, "export function ")
  .replace(/^async function resolveWorkflowJobKey/, "export async function resolveWorkflowJobKey")}

${exportFn(lines.slice(1781, 1800).join("\n"))}
`
)

// --- ui.tsx body (FieldGrid, AvatarUploader, banners, panels) ---
const uiBody = [
  ...lines.slice(920, 1039),
  ...lines.slice(1359, 1455),
  ...lines.slice(1772, 1780),
].join("\n")

writeFileSync(join(dir, "shared/ui.tsx"), exportFn(uiBody))

// --- components ---
writeFileSync(
  join(dir, "components/registration-tabs-list.tsx"),
  exportFn(lines.slice(621, 639).join("\n"))
)
writeFileSync(
  join(dir, "components/task-panel.tsx"),
  exportFn(lines.slice(854, 919).join("\n"))
)
writeFileSync(
  join(dir, "components/relationships-panel.tsx"),
  exportFn(lines.slice(1040, 1234).join("\n"))
)
writeFileSync(
  join(dir, "components/customer-table.tsx"),
  exportFn(lines.slice(1235, 1358).join("\n"))
)

// --- pages ---
writeFileSync(
  join(dir, "pages/registration-page.tsx"),
  exportFn(lines.slice(309, 620).join("\n"))
)
writeFileSync(
  join(dir, "pages/adjustment-page.tsx"),
  exportFn(lines.slice(640, 853).join("\n"))
)

// --- routes.ts ---
writeFileSync(
  join(dir, "routes.ts"),
  `export type CustomerRoute = "registrations" | "profiles" | "risk" | "adjustments"

export function routeFromPath(pathname: string): CustomerRoute {
  if (pathname.startsWith("/customers/profiles")) return "profiles"
  if (pathname.startsWith("/customers/risk-cases")) return "risk"
  if (pathname.startsWith("/customers/adjustments")) return "adjustments"
  return "registrations"
}

export { customerIdFromSearch } from "./shared/task-context"
`
)

// --- page.tsx router ---
writeFileSync(
  join(dir, "page.tsx"),
  `import { lazy, Suspense } from "react"
import { useI18n } from "@workspace/i18n"
import { CustomerTable } from "./components/customer-table"
import { customerIdFromSearch, routeFromPath } from "./routes"

const CustomerRegistrationPage = lazy(() =>
  import("./pages/registration-page").then((m) => ({
    default: m.CustomerRegistrationPage,
  }))
)
const CustomerAdjustmentPage = lazy(() =>
  import("./pages/adjustment-page").then((m) => ({
    default: m.CustomerAdjustmentPage,
  }))
)

export function CustomersPage({ pathname }: { pathname: string }) {
  const { t } = useI18n()
  const route = routeFromPath(pathname)
  if (route === "profiles")
    return (
      <CustomerTable
        title={t("crm.customers.profiles.title")}
        description={t("crm.customers.profiles.description")}
        mode="profiles"
      />
    )
  if (route === "risk")
    return (
      <CustomerTable
        title={t("crm.customers.risk.title")}
        description={t("crm.customers.risk.description")}
        mode="risk"
      />
    )
  if (route === "adjustments")
    return (
      <Suspense fallback={null}>
        <CustomerAdjustmentPage initialCustomerId={customerIdFromSearch()} />
      </Suspense>
    )
  return (
    <Suspense fallback={null}>
      <CustomerRegistrationPage initialCustomerId={customerIdFromSearch()} />
    </Suspense>
  )
}
`
)

unlinkSync(src)
console.log("split done — run prepend-crm-customers.mjs")
