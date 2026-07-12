import { lazy, Suspense } from "react"
import { useI18n } from "@workspace/i18n"
import { CustomerTable } from "./components/customer-table"
import { customerIdFromSearch } from "./utils/task-context"

type CustomerRoute = "registrations" | "profiles" | "risk" | "adjustments"

function routeFromPath(pathname: string): CustomerRoute {
  if (pathname.startsWith("/customers/profiles")) return "profiles"
  if (pathname.startsWith("/customers/risk-cases")) return "risk"
  if (pathname.startsWith("/customers/adjustments")) return "adjustments"
  return "registrations"
}

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
