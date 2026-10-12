import {
  getCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"
import type {
  LoanBatchCancelled,
  LoanBatchCollectionRowInput,
  LoanBatchCompleteRequest,
  LoanBatchDraftCreated,
  LoanBatchPostingPreview,
  LoanBatchRowInput,
  LoanBatchSubmitAccepted,
  LoanCollectionBatch,
  LoanCreateBatchInput,
  LoanCreateBatchInputCollectionInput,
  LoanDisbursementBatch,
  LoanDisbursementBatchHeadroom,
  LoanValidationLine,
} from "@workspace/api/generated/loan-v1"
import type { WireBody } from "./wire"
import type { LoanDisbursementFlowType } from "./disbursements"

export type LoanBatchPaymentMethod = "CASH" | "TRANSFER"

/**
 * Trader (người giao dịch) — mirror của `ObjectInfoValue` (posting-flow). The
 * backend stores it as a string map, so this is the client's narrowing of the
 * generated `trader` field.
 */
export type LoanBatchTrader = {
  object_type: string
  object_code: string
  object_name: string
  id_number?: string
  issue_date?: string
  issue_place?: string
  address?: string
}

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
export type {
  LoanDisbursementBatch,
  LoanDisbursementBatchEvent,
  LoanCollectionBatch,
} from "@workspace/api/generated/loan-v1"
/** Draft create response: a workflow case is created only after explicit submit. */
export type LoanDisbursementBatchDraftCreated = LoanBatchDraftCreated
export type DisbursementBatchSubmitResult = LoanBatchSubmitAccepted
/**
 * Posting preview view model: the generated type allows null arrays (Go nil
 * slices) and null lines (protobuf pointers); preview() normalizes them.
 */
export type DisbursementPostingPreview = Omit<LoanBatchPostingPreview, "headroom" | "global_errors" | "lines"> & {
  headroom: LoanDisbursementBatchHeadroom[]
  global_errors: string[]
  lines: (LoanValidationLine & { errors: string[] })[]
}

function normalizePostingPreview(preview: LoanBatchPostingPreview): DisbursementPostingPreview {
  return {
    ...preview,
    headroom: preview.headroom ?? [],
    global_errors: preview.global_errors ?? [],
    lines: (preview.lines ?? [])
      .filter((line): line is LoanValidationLine => line != null)
      .map((line) => ({ ...line, errors: line.errors ?? [] })),
  }
}
export type DisbursementBatchCancelled = LoanBatchCancelled
/** A batch row: the backend returns the full disbursement record. */
export type LoanDisbursementBatchRow = NonNullable<LoanDisbursementBatch["rows"]>[number]
/** A batch row: the backend returns the full collection record. */
export type LoanCollectionBatchRow = NonNullable<LoanCollectionBatch["rows"]>[number]

type BatchRow = WireBody<Partial<LoanBatchRowInput>, "contract_code" | "agreement_code" | "amount_minor">
type CollectionRow = WireBody<
  Partial<LoanBatchCollectionRowInput>,
  "contract_code" | "agreement_code" | "principal_minor" | "interest_minor"
>

export type DisbursementBatchRegisterInput = WireBody<
  Omit<LoanCreateBatchInput, "rows" | "trader" | "payment_method">,
  "txn_date"
> & {
  payment_method: LoanBatchPaymentMethod
  trader?: LoanBatchTrader
  rows: BatchRow[]
}

export type DisbursementBatchCompleteInput = WireBody<
  Omit<LoanBatchCompleteRequest, "rows" | "trader">,
  "source_batch_id" | "txn_date"
> & {
  trader?: LoanBatchTrader
  /** amount_minor = 0 khi is_closed (đóng hợp đồng, không rút tiếp). */
  rows: BatchRow[]
}

export type DisbursementBatchDraftInput =
  | (DisbursementBatchRegisterInput & { data_version: number })
  | (Omit<DisbursementBatchCompleteInput, "source_batch_id"> & { data_version: number })

export type CollectionBatchCreateInput = WireBody<
  Omit<LoanCreateBatchInputCollectionInput, "rows" | "trader">,
  "txn_date"
> & {
  trader?: LoanBatchTrader
  rows: CollectionRow[]
}

export interface DisbursementWorkflowContext {
  id: string
  currentStep?: string
  candidateRole?: string
  slaDueAt?: string
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
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
  preview: (id: string) =>
    postCanonical<LoanBatchPostingPreview>(
      `/api/loan/disbursement-batches/${encodeURIComponent(id)}/preview`,
      {}
    ).then(normalizePostingPreview),
  cancelDraft: (id: string, dataVersion: number) =>
    postCanonical<DisbursementBatchCancelled>(
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
  workflowCase: async (caseId: string): Promise<DisbursementWorkflowContext> => {
    // The existing workflow case endpoint uses camelCase JSON. Normalize its
    // wire payload here so the rest of the loan UI consumes a view model.
    const response = await getCanonical<Record<string, unknown>>(
      `/api/workflow/cases/${encodeURIComponent(caseId)}`
    )
    return {
      id: optionalString(response.id) ?? caseId,
      currentStep: optionalString(response.currentStep),
      candidateRole: optionalString(response.candidateRole),
      slaDueAt: optionalString(response.slaDueAt),
    }
  },
}

export const collectionBatchApi = {
  create: (body: CollectionBatchCreateInput) =>
    postCanonical<LoanCollectionBatch>("/api/loan/collection-batches", body),
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
