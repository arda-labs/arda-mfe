import { useEffect } from "react"
import { AccountsPage } from "@/features/finance/accounts/page"
import { ApprovalsPage } from "@/features/finance/approvals/page"
import { AccountingConfigPage } from "@/features/finance/operation/page"
import { TransactionsPage } from "@/features/finance/transactions/page"
import { TrialBalancePage } from "@/features/finance/trial-balance/page"

function getPathname() {
  if (typeof window === "undefined") return "/finance/accounts"
  return window.location.pathname
}

export default function Routes() {
  return <FinanceRoutes />
}

function FinanceRoutes() {
  const pathname = getPathname()

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
  if (pathname.startsWith("/finance/transactions/ledger"))
    return <TransactionsPage />
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
