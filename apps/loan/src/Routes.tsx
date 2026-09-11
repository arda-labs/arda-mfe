import { Suspense } from "react"
import { useLocation } from "react-router-dom"
import { registerAppLocales } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { lazyWithPreload } from "@workspace/ui/lib/lazy"
import enLoan from "../locales/en-US.json"
import viLoan from "../locales/vi-VN.json"

registerAppLocales("loan", {
  "vi-VN": viLoan,
  "en-US": enLoan,
})

const LoanPage = lazyWithPreload(() =>
  import("@/features/loan/page").then((m) => ({
    default: m.LoanPage,
  }))
)
const ProductsPage = lazyWithPreload(() =>
  import("@/features/products/page").then((m) => ({
    default: m.ProductsPage,
  }))
)
const VfuPage = lazyWithPreload(() =>
  import("@/features/vfu/page").then((m) => ({
    default: m.VfuPage,
  }))
)
const DisbursementsPage = lazyWithPreload(() =>
  import("@/features/disbursements/page").then((m) => ({
    default: m.DisbursementsPage,
  }))
)
const CollectionsPage = lazyWithPreload(() =>
  import("@/features/collections/page").then((m) => ({
    default: m.CollectionsPage,
  }))
)
// Iteration 13: EPAS batch screens (đăng ký/hoàn tất giải ngân, thu nợ).
const BatchRegisterPage = lazyWithPreload(() =>
  import("@/features/disbursements/batch-register/page").then((m) => ({
    default: m.BatchRegisterPage,
  }))
)
const BatchCompletePage = lazyWithPreload(() =>
  import("@/features/disbursements/batch-complete/page").then((m) => ({
    default: m.BatchCompletePage,
  }))
)
const BatchCollectionPage = lazyWithPreload(() =>
  import("@/features/collections/batch-new/page").then((m) => ({
    default: m.BatchCollectionPage,
  }))
)
// Iteration 14: formation stage screen (LOAN_FORMATION_V2 work-item deep-link)
// + kế hoạch trả nợ (dossier repay_plans).
const FormationPage = lazyWithPreload(() =>
  import("@/features/formation/page").then((m) => ({
    default: m.FormationPage,
  }))
)
const RepayPlanPage = lazyWithPreload(() =>
  import("@/features/loan/repay-plan/page").then((m) => ({
    default: m.RepayPlanPage,
  }))
)
const LoanDossierPage = lazyWithPreload(() =>
  import("@/features/loan/dossier/page").then((m) => ({
    default: m.LoanDossierPage,
  }))
)
const GeneralProvisionPage = lazyWithPreload(() =>
  import("@/features/general-provision/page").then((m) => ({
    default: m.GeneralProvisionPage,
  }))
)
const ReportsPage = lazyWithPreload(() =>
  import("@/features/reports/page").then((m) => ({
    default: m.ReportsPage,
  }))
)
const PlansPage = lazyWithPreload(() =>
  import("@/features/plans/page").then((m) => ({
    default: m.PlansPage,
  }))
)
// Iteration 14 wave FE-2: per-kind adjustment screens (EPAS) — index cards +
// one PostingTabsShell screen per kind at /loans/adjustments/{kind}.
const AdjustmentsIndexPage = lazyWithPreload(() =>
  import("@/features/adjustments/index-page").then((m) => ({
    default: m.AdjustmentsIndexPage,
  }))
)
const AdjustmentKindPage = lazyWithPreload(() =>
  import("@/features/adjustments/page").then((m) => ({
    default: m.AdjustmentKindPage,
  }))
)
const AdjustmentReviewPage = lazyWithPreload(() =>
  import("@/features/adjustments/review/page").then((m) => ({
    default: m.AdjustmentReviewPage,
  }))
)

async function preload(pathname: string) {
  // Adjustment routes MUST be matched before the /loans hub and before each
  // other: review first, then index "/loans/adjustments", then per-kind.
  if (pathname.startsWith("/loans/adjustments/review")) await AdjustmentReviewPage.preload()
  else if (pathname.startsWith("/loans/adjustments/")) await AdjustmentKindPage.preload()
  else if (pathname.startsWith("/loans/adjustments")) await AdjustmentsIndexPage.preload()
  else if (pathname.startsWith("/loans/products")) await ProductsPage.preload()
  else if (pathname.startsWith("/loans/vfu")) await VfuPage.preload()
  // Detail batch routes MUST be matched before their list prefixes —
  // /loans/disbursements/register starts with /loans/disbursements.
  else if (pathname.startsWith("/loans/formation")) await FormationPage.preload()
  else if (pathname.startsWith("/loans/repay-plan")) await RepayPlanPage.preload()
  else if (pathname.startsWith("/loans/dossier")) await LoanDossierPage.preload()
  else if (pathname.startsWith("/loans/general-provision")) await GeneralProvisionPage.preload()
  else if (pathname.startsWith("/loans/reports")) await ReportsPage.preload()
  else if (pathname.startsWith("/loans/plans")) await PlansPage.preload()
  else if (pathname.startsWith("/loans/disbursements/register")) await BatchRegisterPage.preload()
  else if (pathname.startsWith("/loans/disbursements/complete")) await BatchCompletePage.preload()
  else if (pathname.startsWith("/loans/collections/new")) await BatchCollectionPage.preload()
  else if (pathname.startsWith("/loans/disbursements")) await DisbursementsPage.preload()
  else if (pathname.startsWith("/loans/collections")) await CollectionsPage.preload()
  else await LoanPage.preload()
}

function RemoteRoutes() {
  const { pathname } = useLocation()

  let page = <LoanPage pathname={pathname} />
  // Adjustment routes trước /loans hub — review rồi index rồi đến per-kind.
  if (pathname.startsWith("/loans/adjustments/review")) page = <AdjustmentReviewPage />
  else if (pathname.startsWith("/loans/adjustments/")) page = <AdjustmentKindPage pathname={pathname} />
  else if (pathname.startsWith("/loans/adjustments")) page = <AdjustmentsIndexPage />
  else if (pathname.startsWith("/loans/formation")) page = <FormationPage />
  else if (pathname.startsWith("/loans/repay-plan")) page = <RepayPlanPage />
  else if (pathname.startsWith("/loans/dossier")) page = <LoanDossierPage />
  else if (pathname.startsWith("/loans/general-provision")) page = <GeneralProvisionPage />
  else if (pathname.startsWith("/loans/reports")) page = <ReportsPage />
  else if (pathname.startsWith("/loans/plans")) page = <PlansPage />
  else if (pathname.startsWith("/loans/products")) page = <ProductsPage pathname={pathname} />
  else if (pathname.startsWith("/loans/vfu")) page = <VfuPage pathname={pathname} />
  // Same ordering as preload: detail batch routes before the list routes.
  else if (pathname.startsWith("/loans/disbursements/register")) page = <BatchRegisterPage />
  else if (pathname.startsWith("/loans/disbursements/complete")) page = <BatchCompletePage />
  else if (pathname.startsWith("/loans/collections/new")) page = <BatchCollectionPage />
  else if (pathname.startsWith("/loans/disbursements")) page = <DisbursementsPage pathname={pathname} />
  else if (pathname.startsWith("/loans/collections")) page = <CollectionsPage pathname={pathname} />

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Suspense fallback={null}>
        <QueryProvider>{page}</QueryProvider>
      </Suspense>
    </div>
  )
}

export default Object.assign(RemoteRoutes, { preload })
