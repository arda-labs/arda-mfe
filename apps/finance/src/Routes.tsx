import { createAppLocaleLoader } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const locales = createAppLocaleLoader("finance", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})
const AccountsPage = lazyWithPreload(() => import("@/features/finance/accounts/page").then((m) => ({ default: m.AccountsPage })))
const AccountingConfigPage = lazyWithPreload(() => import("@/features/finance/operation/page").then((m) => ({ default: m.AccountingConfigPage })))
const TrialBalancePage = lazyWithPreload(() => import("@/features/finance/trial-balance/page").then((m) => ({ default: m.TrialBalancePage })))
const StatementsPage = lazyWithPreload(() => import("@/features/finance/statements/page").then((m) => ({ default: m.StatementsPage })))
const JournalPage = lazyWithPreload(() => import("@/features/finance/journal/page").then((m) => ({ default: m.JournalPage })))
const LedgerPage = lazyWithPreload(() => import("@/features/finance/ledger/page").then((m) => ({ default: m.LedgerPage })))
const CounterpartiesPage = lazyWithPreload(() => import("@/features/finance/counterparties/page").then((m) => ({ default: m.CounterpartiesPage })))
const CashPage = lazyWithPreload(() => import("@/features/finance/cash/page").then((m) => ({ default: m.CashPage })))
const FundsPage = lazyWithPreload(() => import("@/features/finance/funds/page").then((m) => ({ default: m.FundsPage })))
const OpeningBalancesPage = lazyWithPreload(() => import("@/features/finance/opening-balances/page").then((m) => ({ default: m.OpeningBalancesPage })))
const SingleEntryPostingPage = lazyWithPreload(() => import("@/features/finance/posting/single-entry/page").then((m) => ({ default: m.SingleEntryPostingPage })))
const SingleEntryPostingInitPage = lazyWithPreload(() => import("@/features/finance/posting/single-entry/init").then((m) => ({ default: m.SingleEntryPostingInitPage })))
const DoubleEntryPostingPage = lazyWithPreload(() => import("@/features/finance/posting/double-entry/page").then((m) => ({ default: m.DoubleEntryPostingPage })))
const DoubleEntryPostingInitPage = lazyWithPreload(() => import("@/features/finance/posting/double-entry/init").then((m) => ({ default: m.DoubleEntryPostingInitPage })))
const OffBalancePostingPage = lazyWithPreload(() => import("@/features/finance/posting/off-balance/page").then((m) => ({ default: m.OffBalancePostingPage })))
const OffBalancePostingInitPage = lazyWithPreload(() => import("@/features/finance/posting/off-balance/init").then((m) => ({ default: m.OffBalancePostingInitPage })))
const CancellationPostingPage = lazyWithPreload(() => import("@/features/finance/posting/cancellation/page").then((m) => ({ default: m.CancellationPostingPage })))
const CancellationPostingInitPage = lazyWithPreload(() => import("@/features/finance/posting/cancellation/init").then((m) => ({ default: m.CancellationPostingInitPage })))
const ClosingPostingPage = lazyWithPreload(() => import("@/features/finance/posting/closing/page").then((m) => ({ default: m.ClosingPostingPage })))
const ClosingPostingInitPage = lazyWithPreload(() => import("@/features/finance/posting/closing/init").then((m) => ({ default: m.ClosingPostingInitPage })))
const PostingReviewPage = lazyWithPreload(() => import("@/features/finance/posting/review/page").then((m) => ({ default: m.PostingReviewPage })))

export default createRemoteRoutes({
  locales, wrapper: QueryProvider, defaultComponent: AccountsPage,
  defaultPrefixes: ["/finance"],
  routes: [
    { prefix: "/finance/accounting-config", component: AccountingConfigPage },
    { prefix: "/finance/trial-balance", component: TrialBalancePage },
    { prefix: "/finance/statements", component: StatementsPage },
    { prefix: "/finance/journal", component: JournalPage },
    { prefix: "/finance/ledger", component: LedgerPage },
    { prefix: "/finance/counterparties", component: CounterpartiesPage },
    { prefix: "/finance/cash", component: CashPage },
    { prefix: "/finance/funds", component: FundsPage },
    { prefix: "/finance/opening-balances", component: OpeningBalancesPage },
    { prefix: "/finance/posting/review", component: PostingReviewPage },
    { prefix: "/finance/posting/single-entry/init", component: SingleEntryPostingInitPage },
    { prefix: "/finance/posting/single-entry", component: SingleEntryPostingPage },
    { prefix: "/finance/posting/double-entry/init", component: DoubleEntryPostingInitPage },
    { prefix: "/finance/posting/double-entry", component: DoubleEntryPostingPage },
    { prefix: "/finance/posting/off-balance/init", component: OffBalancePostingInitPage },
    { prefix: "/finance/posting/off-balance", component: OffBalancePostingPage },
    { prefix: "/finance/posting/cancellation/init", component: CancellationPostingInitPage },
    { prefix: "/finance/posting/cancellation", component: CancellationPostingPage },
    { prefix: "/finance/posting/closing/init", component: ClosingPostingInitPage },
    { prefix: "/finance/posting/closing", component: ClosingPostingPage },
  ],
})
