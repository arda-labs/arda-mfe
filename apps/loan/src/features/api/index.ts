/**
 * Loan domain API — split from the former features/api.ts.
 *
 * Consumers keep importing `../api`; the `loanApi` facade below composes the
 * per-resource contract/adjustment/agreement clients so existing call sites
 * stay unchanged while the file debt is gone.
 */
import { contractsApi } from "./contracts"
import { adjustmentsApi } from "./adjustments"
import { agreementsApi } from "./agreements"

export * from "./adjustments"
export * from "./agreements"
export * from "./batches"
export * from "./collections"
export * from "./contracts"
export * from "./disbursements"
export * from "./dossier"
export * from "./formation"
export * from "./plans"
export * from "./products"
export * from "./provisions"
export * from "./reports"
export * from "./vfu"

/** Contract + adjustment + agreement facade kept for existing call sites. */
export const loanApi = {
  ...contractsApi,
  ...adjustmentsApi,
  ...agreementsApi,
}
