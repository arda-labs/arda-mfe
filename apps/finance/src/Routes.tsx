import { lazy, Suspense, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"

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

export default function RemoteRoutes() {
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

function Redirect({ to }: { to: string }) {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(to, { replace: true })
  }, [navigate, to])

  return null
}
