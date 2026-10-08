import {
  getCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"
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

/** Draft create response: a workflow case is created only after explicit submit. */
export interface LoanDisbursementBatchDraftCreated {
  id: string
  batch_id: string
  status: "DRAFT"
  data_version: number
}

export interface DisbursementBatchRegisterInput {
  data_version?: number
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
  data_version?: number
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

export type DisbursementBatchDraftInput =
  | (DisbursementBatchRegisterInput & { data_version: number })
  | (Omit<DisbursementBatchCompleteInput, "source_batch_id"> & { data_version: number })

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
  /** Row version the checker saw — sent back as `dataVersion` on approve. */
  data_version?: number
  /** Chỉ có trên detail (GET /{id}). */
  rows?: LoanDisbursementBatchRow[]
  history?: LoanDisbursementBatchEvent[]
}

export interface LoanDisbursementBatchEvent {
  event_type: string
  from_status?: string
  to_status?: string
  detail?: string
  actor?: string
  created_at: string
}

export interface DisbursementBatchSubmitResult {
  batch_id: string
  reference_no: string
  status: "PENDING_APPROVAL"
  data_version: number
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
  total_principal_minor?: number
  total_interest_minor?: number
  currency_code?: string
  status: string
  case_id?: string
  case_code?: string
  workflow_case_code?: string
  created_by?: string
  created_at?: string
  /** Row version the checker saw — sent back as `dataVersion` on approve. */
  data_version?: number
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
    postCanonical<LoanDisbursementBatchDraftCreated>("/api/loan/disbursement-batches", body),
  updateDraft: (id: string, body: DisbursementBatchDraftInput) =>
    putCanonical<LoanDisbursementBatch>(
      `/api/loan/disbursement-batches/${encodeURIComponent(id)}`,
      body
    ),
  submit: (id: string, dataVersion: number) =>
    postCanonical<DisbursementBatchSubmitResult>(
      `/api/loan/disbursement-batches/${encodeURIComponent(id)}/submit`,
      { data_version: dataVersion }
    ),
  cancelDraft: (id: string, dataVersion: number) =>
    postCanonical<{ batch_id: string; status: string }>(
      `/api/loan/disbursement-batches/${encodeURIComponent(id)}/cancel`,
      { data_version: dataVersion }
    ),
  createComplete: (body: DisbursementBatchCompleteInput) =>
    postCanonical<LoanDisbursementBatchDraftCreated>(
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
