import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const dir = join(import.meta.dir, "../apps/crm/src/features/customers")
const src = join(dir, "page.tsx")
copyFileSync(src, join(dir, "page.backup.tsx"))
const lines = readFileSync(src, "utf8").split("\n")

mkdirSync(join(dir, "shared"), { recursive: true })
mkdirSync(join(dir, "components"), { recursive: true })
mkdirSync(join(dir, "pages"), { recursive: true })

const schemaHeader = `import { z } from "zod"

export type CustomerRoute = "registrations" | "profiles" | "risk" | "adjustments"

`

writeFileSync(join(dir, "shared/schemas.ts"), schemaHeader + lines.slice(63, 284).join("\n") + "\n")

writeFileSync(
  join(dir, "routes.ts"),
  `import type { CustomerRoute } from "./shared/schemas"
export type { CustomerRoute } from "./shared/schemas"

${lines
  .slice(1801, 1807)
  .join("\n")
  .replace("function routeFromPath", "export function routeFromPath")}

export { customerIdFromSearch } from "./shared/task-context"
`
)

writeFileSync(
  join(dir, "shared/task-context.ts"),
  `import type { ReactNode } from "react"
import { notify } from "@workspace/notifications/notify"
import { customerApi, type WorkflowTaskRole } from "../api"

${lines
  .slice(1646, 1800)
  .join("\n")
  .replace(/^type CustomerTaskContext/, "export type CustomerTaskContext")
  .replace(/^function /gm, "export function ")}
`
)

const formUtils = lines.slice(1456, 1645).join("\n") + "\n" + lines.slice(1813).join("\n")
writeFileSync(
  join(dir, "shared/form-utils.ts"),
  `import type { Customer, CustomerPayload, CustomerType } from "../api"
import type { CustomerFormValues } from "./schemas"

${formUtils
  .replace(/^function optionsFor/, "export function optionsFor")
  .replace(/^function toPayload/, "export function toPayload")
  .replace(/^function toFormValues/, "export function toFormValues")
  .replace(/^function pick/, "export function pick")
  .replace(/^function stringValue/, "export function stringValue")
  .replace(/^function customerTypeLabel/, "export function customerTypeLabel")
  .replace(/^function relationLabel/, "export function relationLabel")
  .replace(/^function toAmendmentSnapshot/, "export function toAmendmentSnapshot")
  .replace(/^function computeChangedFields/, "export function computeChangedFields")}
`
)

const uiBlock = lines.slice(920, 1455).join("\n")
writeFileSync(
  join(dir, "shared/ui.tsx"),
  uiBlock.replace(/^function /gm, "export function ")
)

// Fix ui - need imports header added by second script

writeFileSync(
  join(dir, "components/customer-table.tsx"),
  lines.slice(1235, 1359).join("\n").replace("function CustomerTable", "export function CustomerTable")
)

writeFileSync(
  join(dir, "components/relationships-panel.tsx"),
  lines
    .slice(1040, 1234)
    .join("\n")
    .replace("function RelationshipsPanel", "export function RelationshipsPanel")
    .replace("function RelationSelect", "export function RelationSelect")
)

writeFileSync(
  join(dir, "components/task-panel.tsx"),
  lines.slice(854, 919).join("\n").replace("function CurrentTaskPanel", "export function CurrentTaskPanel")
)

writeFileSync(
  join(dir, "components/registration-tabs-list.tsx"),
  lines.slice(621, 639).join("\n").replace("function CustomerRegistrationTabsList", "export function CustomerRegistrationTabsList")
)

writeFileSync(
  join(dir, "pages/registration-page.tsx"),
  lines.slice(309, 620).join("\n").replace("function CustomerRegistrationPage", "export function CustomerRegistrationPage")
)

writeFileSync(
  join(dir, "pages/adjustment-page.tsx"),
  lines.slice(640, 853).join("\n").replace("function CustomerAdjustmentPage", "export function CustomerAdjustmentPage")
)

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

console.log("crm extract done — run prepend-crm-customers.mjs")
