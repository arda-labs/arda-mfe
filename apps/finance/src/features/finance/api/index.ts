/**
 * Finance domain API — split from the former features/finance/api.ts.
 *
 * Consumers keep importing `@/features/finance/api`; each resource module owns
 * its client object (accountsApi, trialBalanceApi, statementsApi, postingApi,
 * postingCaseApi, closingApi, journalEntryApi, workflowTaskApi,
 * counterpartyApi) plus the pure list/ledger functions.
 */
export * from "./accounts"
export * from "./cash"
export * from "./closing"
export * from "./counterparties"
export * from "./journal"
export * from "./ledger"
export * from "./posting"
export * from "./review"
export * from "./statements"
export * from "./trial-balance"
export * from "./types"
