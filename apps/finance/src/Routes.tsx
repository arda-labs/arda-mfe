import { AccountsPage } from "@/features/finance/accounts/page"
import { ApprovalsPage } from "@/features/finance/approvals/page"
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

  if (pathname.startsWith("/finance/transactions")) return <TransactionsPage />
  if (pathname.startsWith("/finance/approvals")) return <ApprovalsPage />
  if (pathname.startsWith("/finance/trial-balance")) return <TrialBalancePage />

  return <AccountsPage />
}
