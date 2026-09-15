import { createAppLocaleLoader } from "@workspace/i18n"
import { QueryProvider } from "@workspace/query/provider"
import { createRemoteRoutes, lazyWithPreload } from "@workspace/ui/lib/lazy"

const locales = createAppLocaleLoader("loan", {
  "vi-VN": () => import("../locales/vi-VN.json"),
  "en-US": () => import("../locales/en-US.json"),
})
const LoanPage = lazyWithPreload(() => import("@/features/loan/page").then((m) => ({ default: m.LoanPage })))
const ProductsPage = lazyWithPreload(() => import("@/features/products/page").then((m) => ({ default: m.ProductsPage })))
const VfuPage = lazyWithPreload(() => import("@/features/vfu/page").then((m) => ({ default: m.VfuPage })))
const DisbursementsPage = lazyWithPreload(() => import("@/features/disbursements/page").then((m) => ({ default: m.DisbursementsPage })))
const CollectionsPage = lazyWithPreload(() => import("@/features/collections/page").then((m) => ({ default: m.CollectionsPage })))
const BatchRegisterPage = lazyWithPreload(() => import("@/features/disbursements/batch-register/page").then((m) => ({ default: m.BatchRegisterPage })))
const BatchCompletePage = lazyWithPreload(() => import("@/features/disbursements/batch-complete/page").then((m) => ({ default: m.BatchCompletePage })))
const BatchCollectionPage = lazyWithPreload(() => import("@/features/collections/batch-new/page").then((m) => ({ default: m.BatchCollectionPage })))
const FormationPage = lazyWithPreload(() => import("@/features/formation/page").then((m) => ({ default: m.FormationPage })))
const RepayPlanPage = lazyWithPreload(() => import("@/features/loan/repay-plan/page").then((m) => ({ default: m.RepayPlanPage })))
const LoanDossierPage = lazyWithPreload(() => import("@/features/loan/dossier/page").then((m) => ({ default: m.LoanDossierPage })))
const GeneralProvisionPage = lazyWithPreload(() => import("@/features/general-provision/page").then((m) => ({ default: m.GeneralProvisionPage })))
const ReportsPage = lazyWithPreload(() => import("@/features/reports/page").then((m) => ({ default: m.ReportsPage })))
const PlansPage = lazyWithPreload(() => import("@/features/plans/page").then((m) => ({ default: m.PlansPage })))
const SpecificProvisionPage = lazyWithPreload(() => import("@/features/specific-provision/page").then((m) => ({ default: m.SpecificProvisionPage })))
const AdjustmentsIndexPage = lazyWithPreload(() => import("@/features/adjustments/index-page").then((m) => ({ default: m.AdjustmentsIndexPage })))
const AdjustmentKindPage = lazyWithPreload(() => import("@/features/adjustments/page").then((m) => ({ default: m.AdjustmentKindPage })))
const AdjustmentReviewPage = lazyWithPreload(() => import("@/features/adjustments/review/page").then((m) => ({ default: m.AdjustmentReviewPage })))

export default createRemoteRoutes({
  locales, wrapper: QueryProvider, defaultComponent: LoanPage,
  defaultPrefixes: ["/loans"],
  routes: [
    { prefix: "/loans/adjustments/review", component: AdjustmentReviewPage },
    { prefix: "/loans/adjustments/", component: AdjustmentKindPage },
    { prefix: "/loans/adjustments", exact: true, component: AdjustmentsIndexPage },
    { prefix: "/loans/products", component: ProductsPage },
    { prefix: "/loans/vfu", component: VfuPage },
    { prefix: "/loans/formation", component: FormationPage },
    { prefix: "/loans/repay-plan", component: RepayPlanPage },
    { prefix: "/loans/dossier", component: LoanDossierPage },
    { prefix: "/loans/general-provision", component: GeneralProvisionPage },
    { prefix: "/loans/reports", component: ReportsPage },
    { prefix: "/loans/plans", component: PlansPage },
    { prefix: "/loans/specific-provision", component: SpecificProvisionPage },
    { prefix: "/loans/disbursements/register", component: BatchRegisterPage },
    { prefix: "/loans/disbursements/complete", component: BatchCompletePage },
    { prefix: "/loans/collections/new", component: BatchCollectionPage },
    { prefix: "/loans/disbursements", component: DisbursementsPage },
    { prefix: "/loans/collections", component: CollectionsPage },
  ],
})
