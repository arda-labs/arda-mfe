import { useEffect } from "react"
import { lazy, Suspense } from "react"
import { usePathname } from "@workspace/core/routing"

const AccountsPage = lazy(() =>
  import("@/features/finance/accounts/page").then((m) => ({ default: m.AccountsPage }))
)
const ApprovalsPage = lazy(() =>
  import("@/features/finance/approvals/page").then((m) => ({ default: m.ApprovalsPage }))
)
const AccountingConfigPage = lazy(() =>
  import("@/features/finance/operation/page").then((m) => ({
    default: m.AccountingConfigPage,
  }))
)
const TransactionsPage = lazy(() =>
  import("@/features/finance/transactions/page").then((m) => ({
    default: m.TransactionsPage,
  }))
)
const TrialBalancePage = lazy(() =>
  import("@/features/finance/trial-balance/page").then((m) => ({
    default: m.TrialBalancePage,
  }))
)

export default function Routes() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <FinanceRoutes />
      </Suspense>
    </div>
  )
}

function FinanceRoutes() {
  const pathname = usePathname("/finance/accounts")

  if (
    pathname.startsWith("/finance/transactions/search") ||
    pathname.startsWith("/finance/transaction-search")
  )
    return <RedirectTo path="/workbench/transaction-search" />
  if (
    pathname.startsWith("/finance/transactions/outgoing") ||
    pathname.startsWith("/finance/outgoing-transactions")
  )
    return <RedirectTo path="/workbench/outgoing-transactions" />
  if (
    pathname.startsWith("/finance/transactions/incoming") ||
    pathname.startsWith("/finance/incoming-transactions")
  )
    return <RedirectTo path="/workbench/incoming-transactions" />
  if (
    pathname.startsWith("/finance/accounting-config") ||
    pathname.startsWith("/finance/transactions/accounting-config")
  )
    return <AccountingConfigPage />
  if (pathname.startsWith("/finance/transactions/ledger")) return <TransactionsPage />
  if (pathname.startsWith("/finance/transactions")) return <TransactionsPage />
  if (pathname.startsWith("/finance/approvals")) return <ApprovalsPage />
  if (pathname.startsWith("/finance/trial-balance")) return <TrialBalancePage />

  return <AccountsPage />
}

function RedirectTo({ path }: { path: string }) {
  useEffect(() => {
    window.history.replaceState({}, "", path)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }, [path])
  return null
}
