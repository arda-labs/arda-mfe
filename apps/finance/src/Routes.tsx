import "@workspace/i18n/apps/finance"
import { Suspense, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { QueryProvider } from "@workspace/query/provider"
import { attachPreload, lazyWithPreload } from "@workspace/ui/lib/lazy"

const AccountsPage = lazyWithPreload(() =>
  import("@/features/finance/accounts/page").then((m) => ({
    default: m.AccountsPage,
  }))
)
const ApprovalsPage = lazyWithPreload(() =>
  import("@/features/finance/approvals/page").then((m) => ({
    default: m.ApprovalsPage,
  }))
)
const AccountingConfigPage = lazyWithPreload(() =>
  import("@/features/finance/operation/page").then((m) => ({
    default: m.AccountingConfigPage,
  }))
)
const TransactionsPage = lazyWithPreload(() =>
  import("@/features/finance/transactions/page").then((m) => ({
    default: m.TransactionsPage,
  }))
)
const TrialBalancePage = lazyWithPreload(() =>
  import("@/features/finance/trial-balance/page").then((m) => ({
    default: m.TrialBalancePage,
  }))
)

async function preload(pathname = "") {
  if (
    pathname.startsWith("/finance/transactions/search") ||
    pathname.startsWith("/finance/transaction-search") ||
    pathname.startsWith("/finance/transactions/outgoing") ||
    pathname.startsWith("/finance/outgoing-transactions") ||
    pathname.startsWith("/finance/transactions/incoming") ||
    pathname.startsWith("/finance/incoming-transactions")
  ) {
    return
  }

  let page = AccountsPage
  if (
    pathname.startsWith("/finance/accounting-config") ||
    pathname.startsWith("/finance/transactions/accounting-config")
  ) {
    page = AccountingConfigPage
  }
  if (pathname.startsWith("/finance/transactions")) page = TransactionsPage
  if (pathname.startsWith("/finance/approvals")) page = ApprovalsPage
  if (pathname.startsWith("/finance/trial-balance")) page = TrialBalancePage
  await page.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  if (
    pathname.startsWith("/finance/transactions/search") ||
    pathname.startsWith("/finance/transaction-search")
  ) {
    return <Redirect to="/workbench/transaction-search" />
  }
  if (
    pathname.startsWith("/finance/transactions/outgoing") ||
    pathname.startsWith("/finance/outgoing-transactions")
  ) {
    return <Redirect to="/workbench/outgoing-transactions" />
  }
  if (
    pathname.startsWith("/finance/transactions/incoming") ||
    pathname.startsWith("/finance/incoming-transactions")
  ) {
    return <Redirect to="/workbench/incoming-transactions" />
  }

  let page = <AccountsPage />
  if (
    pathname.startsWith("/finance/accounting-config") ||
    pathname.startsWith("/finance/transactions/accounting-config")
  ) {
    page = <AccountingConfigPage />
  }
  if (pathname.startsWith("/finance/transactions")) page = <TransactionsPage />
  if (pathname.startsWith("/finance/approvals")) page = <ApprovalsPage />
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

function Redirect({ to }: { to: string }) {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(to, { replace: true })
  }, [navigate, to])

  return null
}
