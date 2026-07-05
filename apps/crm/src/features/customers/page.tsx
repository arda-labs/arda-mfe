import { lazy, Suspense } from "react"
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
