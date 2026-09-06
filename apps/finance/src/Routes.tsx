import { registerAppLocales } from "@workspace/i18n"
import enFinance from "../locales/en-US.json"
import viFinance from "../locales/vi-VN.json"

registerAppLocales("finance", {
  "vi-VN": viFinance,
  "en-US": enFinance,
})
import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { QueryProvider } from "@workspace/query/provider"
import { attachPreload, lazyWithPreload } from "@workspace/ui/lib/lazy"

const AccountsPage = lazyWithPreload(() =>
  import("@/features/finance/accounts/page").then((m) => ({
    default: m.AccountsPage,
  }))
)
const AccountingConfigPage = lazyWithPreload(() =>
  import("@/features/finance/operation/page").then((m) => ({
    default: m.AccountingConfigPage,
  }))
)
const TrialBalancePage = lazyWithPreload(() =>
  import("@/features/finance/trial-balance/page").then((m) => ({
    default: m.TrialBalancePage,
  }))
)

async function preload(pathname = "") {
  let page = AccountsPage
  if (pathname.startsWith("/finance/accounting-config")) page = AccountingConfigPage
  if (pathname.startsWith("/finance/trial-balance")) page = TrialBalancePage
  await page.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <AccountsPage />
  if (pathname.startsWith("/finance/accounting-config")) {
    page = <AccountingConfigPage />
  }
  if (pathname.startsWith("/finance/trial-balance")) page = <TrialBalancePage />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>{page}</Suspense>
    </div>
  )
}

const RemoteRoutesWithPreload = attachPreload(RemoteRoutes, preload)

/**
 * Every remote mounts the shared TanStack Query client at its route root so
 * server-list pages can adopt @workspace/admin-list without per-page wiring.
 */
const RemoteRoutesWithProviders = Object.assign(
  function ProvidedRoutes() {
    return (
      <QueryProvider>
        <RemoteRoutesWithPreload />
      </QueryProvider>
    )
  },
  { preload: RemoteRoutesWithPreload.preload }
)

export default RemoteRoutesWithProviders
