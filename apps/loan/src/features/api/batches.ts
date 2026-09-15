import { getCanonical, getCanonicalList, postCanonical } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"
import type { LoanDisbursementFlowType } from "./disbursements"

export type LoanBatchPaymentMethod = "CASH" | "TRANSFER"

/**
 * Trader (người giao dịch) — mirror của `ObjectInfoValue` (posting-flow) trên wire.
 */
export interface LoanBatchTrader {
  object_type: string
  object_code: string
  object_name: string
  id_number?: string
  issue_date?: string
  issue_place?: string
  address?: string
}

/**
 * Response chung của create batch: case (workflow) + batch ledger id.
 * BE trả nguyên hàng batch (`domain.DisbursementBatch` / `CollectionBatch`)
 * nên case thực tế nằm ở `workflow_case_id`/`workflow_case_code`, batch ledger
 * ở `id`; các alias `case_id`/`case_code`/`batch_id` giữ để tương thích.
 */
export interface LoanBatchCreated {
  case_id: string
  case_code: string
  batch_id: string
  id?: string
  workflow_case_id?: string
  workflow_case_code?: string
}

export interface DisbursementBatchRegisterInput {
  org_code?: string
  txn_date: string
  payment_method: LoanBatchPaymentMethod
  account_code?: string
  description?: string
  trader?: LoanBatchTrader
  rows: {
    contract_code: string
    agreement_code: string
    amount_minor: number
  }[]
}

export interface DisbursementBatchCompleteInput {
  source_batch_id: string
  txn_date: string
  description?: string
  trader?: LoanBatchTrader
  /** amount_minor = 0 khi is_closed (đóng hợp đồng, không rút tiếp). */
  rows: {
    contract_code: string
    agreement_code: string
    amount_minor: number
    is_closed?: boolean
  }[]
}

export interface CollectionBatchCreateInput {
  txn_date: string
  description?: string
  trader?: LoanBatchTrader
  rows: {
    contract_code: string
    agreement_code: string
    principal_minor: number
    interest_minor: number
    overdue_interest_minor?: number
  }[]
}

/** Batch list item: header fields + friendly workflow_case_code. */
export interface LoanDisbursementBatch {
  id: string
  tenant_id?: string
  txn_date: string
  payment_method?: LoanBatchPaymentMethod
  account_code?: string
  description?: string
  flow_type?: LoanDisbursementFlowType
  source_batch_id?: string
  total_amt_minor?: number
  currency_code?: string
  status: string
  case_id?: string
  case_code?: string
  workflow_case_code?: string
  created_by?: string
  created_at?: string
  /** Chỉ có trên detail (GET /{id}). */
  rows?: LoanDisbursementBatchRow[]
}

export interface LoanDisbursementBatchRow {
  contract_code: string
  agreement_code: string
  amount_minor: number
  status?: string
  is_closed?: boolean
}

export interface LoanCollectionBatch {
  id: string
  tenant_id?: string
  txn_date: string
  description?: string
  total_amt_minor?: number
  currency_code?: string
  status: string
  case_id?: string
  case_code?: string
  workflow_case_code?: string
  created_by?: string
  created_at?: string
  rows?: LoanCollectionBatchRow[]
}

export interface LoanCollectionBatchRow {
  contract_code: string
  agreement_code: string
  principal_minor: number
  interest_minor: number
  overdue_interest_minor?: number
}

export const disbursementBatchApi = {
  createRegister: (body: DisbursementBatchRegisterInput) =>
    postCanonical<LoanBatchCreated>("/api/loan/disbursement-batches", body),
  createComplete: (body: DisbursementBatchCompleteInput) =>
    postCanonical<LoanBatchCreated>(
      "/api/loan/disbursement-batches/complete",
      body
    ),
  list: (
    params: {
      status?: string
      flow_type?: LoanDisbursementFlowType
      q?: string
      page?: number
      per_page?: number
    } = {}
  ) =>
    getCanonicalList<LoanDisbursementBatch>(
      `/api/loan/disbursement-batches?${buildSearchParams(params).toString()}`
    ),
  detail: (id: string) =>
    getCanonical<LoanDisbursementBatch>(
      `/api/loan/disbursement-batches/${encodeURIComponent(id)}`
    ),
}

export const collectionBatchApi = {
  create: (body: CollectionBatchCreateInput) =>
    postCanonical<LoanBatchCreated>("/api/loan/collection-batches", body),
  list: (
    params: {
      status?: string
      q?: string
      page?: number
      per_page?: number
    } = {}
  ) =>
    getCanonicalList<LoanCollectionBatch>(
      `/api/loan/collection-batches?${buildSearchParams(params).toString()}`
    ),
  detail: (id: string) =>
    getCanonical<LoanCollectionBatch>(
      `/api/loan/collection-batches/${encodeURIComponent(id)}`
    ),
}
