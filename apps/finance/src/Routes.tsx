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
const StatementsPage = lazyWithPreload(() =>
  import("@/features/finance/statements/page").then((m) => ({
    default: m.StatementsPage,
  }))
)
const JournalPage = lazyWithPreload(() =>
  import("@/features/finance/journal/page").then((m) => ({
    default: m.JournalPage,
  }))
)
const SingleEntryPostingPage = lazyWithPreload(() =>
  import("@/features/finance/posting/single-entry/page").then((m) => ({
    default: m.SingleEntryPostingPage,
  }))
)
const SingleEntryPostingInitPage = lazyWithPreload(() =>
  import("@/features/finance/posting/single-entry/init").then((m) => ({
    default: m.SingleEntryPostingInitPage,
  }))
)
const DoubleEntryPostingPage = lazyWithPreload(() =>
  import("@/features/finance/posting/double-entry/page").then((m) => ({
    default: m.DoubleEntryPostingPage,
  }))
)
const DoubleEntryPostingInitPage = lazyWithPreload(() =>
  import("@/features/finance/posting/double-entry/init").then((m) => ({
    default: m.DoubleEntryPostingInitPage,
  }))
)
const OffBalancePostingPage = lazyWithPreload(() =>
  import("@/features/finance/posting/off-balance/page").then((m) => ({
    default: m.OffBalancePostingPage,
  }))
)
const OffBalancePostingInitPage = lazyWithPreload(() =>
  import("@/features/finance/posting/off-balance/init").then((m) => ({
    default: m.OffBalancePostingInitPage,
  }))
)
const CancellationPostingPage = lazyWithPreload(() =>
  import("@/features/finance/posting/cancellation/page").then((m) => ({
    default: m.CancellationPostingPage,
  }))
)
const CancellationPostingInitPage = lazyWithPreload(() =>
  import("@/features/finance/posting/cancellation/init").then((m) => ({
    default: m.CancellationPostingInitPage,
  }))
)

async function preload(pathname = "") {
  let page = AccountsPage
  if (pathname.startsWith("/finance/accounting-config")) page = AccountingConfigPage
  if (pathname.startsWith("/finance/trial-balance")) page = TrialBalancePage
  if (pathname.startsWith("/finance/statements")) page = StatementsPage
  if (pathname.startsWith("/finance/journal")) page = JournalPage
  // Posting init routes must match BEFORE the list prefix (both start with
  // /finance/posting/<flow>).
  if (pathname.startsWith("/finance/posting/single-entry/init")) page = SingleEntryPostingInitPage
  else if (pathname.startsWith("/finance/posting/single-entry")) page = SingleEntryPostingPage
  if (pathname.startsWith("/finance/posting/double-entry/init")) page = DoubleEntryPostingInitPage
  else if (pathname.startsWith("/finance/posting/double-entry")) page = DoubleEntryPostingPage
  if (pathname.startsWith("/finance/posting/off-balance/init")) page = OffBalancePostingInitPage
  else if (pathname.startsWith("/finance/posting/off-balance")) page = OffBalancePostingPage
  if (pathname.startsWith("/finance/posting/cancellation/init")) page = CancellationPostingInitPage
  else if (pathname.startsWith("/finance/posting/cancellation")) page = CancellationPostingPage
  await page.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <AccountsPage />
  if (pathname.startsWith("/finance/accounting-config")) {
    page = <AccountingConfigPage />
  }
  if (pathname.startsWith("/finance/trial-balance")) page = <TrialBalancePage />
  if (pathname.startsWith("/finance/statements")) page = <StatementsPage />
  if (pathname.startsWith("/finance/journal")) page = <JournalPage pathname={pathname} />
  // Init branches before list branches — same prefix, init is the longer path.
  if (pathname.startsWith("/finance/posting/single-entry/init")) {
    page = <SingleEntryPostingInitPage />
  } else if (pathname.startsWith("/finance/posting/single-entry")) {
    page = <SingleEntryPostingPage />
  }
  if (pathname.startsWith("/finance/posting/double-entry/init")) {
    page = <DoubleEntryPostingInitPage />
  } else if (pathname.startsWith("/finance/posting/double-entry")) {
    page = <DoubleEntryPostingPage />
  }
  // Init branches before list branches — same prefix, init is the longer path.
  if (pathname.startsWith("/finance/posting/off-balance/init")) {
    page = <OffBalancePostingInitPage />
  } else if (pathname.startsWith("/finance/posting/off-balance")) {
    page = <OffBalancePostingPage />
  }
  if (pathname.startsWith("/finance/posting/cancellation/init")) {
    page = <CancellationPostingInitPage />
  } else if (pathname.startsWith("/finance/posting/cancellation")) {
    page = <CancellationPostingPage />
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>{page}</Suspense>
    </div>
  )
}

const RemoteRoutesWithPreload = attachPreload(RemoteRoutes, preload)

/**
 * Every remote mounts the shared TanStack Query client at its route root so
 * server-list pages can adopt @workspace/list-page without per-page wiring.
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
