/**
 * Shared types for the EPAS-style posting-flow shell (iteration 9).
 *
 * The package is intentionally dependency-light: it never imports the API
 * client or a feature's api.ts — network access is injected via callback props
 * (`fetchAccounts`, `validate`) so any remote can wire its own endpoints.
 * Display strings are passed by the consumer (labels props) so the shell stays
 * locale-agnostic; generic fallbacks use the shared `common:*` namespace.
 */

export type PostingDirection = "DEBIT" | "CREDIT"

/** Account row shape the `ChooseAccountDialog` understands. */
export interface AccountOption {
  code: string
  name: string
  currency?: string
  isActive?: boolean
}

/** One editable journal line inside `EntryLinesGrid`. */
export interface EntryLineRow {
  /** Stable client id (not sent to the BE — lines are renumbered by position). */
  id: string
  direction: PostingDirection
  account_code: string
  /** Auto-filled read-only name (from the account picker / validate result). */
  account_name: string
  /** Major-unit amount as typed by the user (minor conversion is done on emit). */
  amount: string
  description: string
  /** When true the direction select is disabled (pinned Nợ/Có rows). */
  pinnedDirection?: boolean
}

export type FetchAccountsFn = (params: {
  q?: string
  page: number
  perPage: number
}) => Promise<{ items: AccountOption[]; total: number }>

/** Minimal validate-endpoint contract (structural subset of finance's
 * `ValidationResult` — any backend following the posting spec matches). */
export interface PostingValidateLine {
  line_no: number
  resolved: boolean
  account_code: string
  account_name: string
  direction: string
  amount_minor: number
  currency_code?: string
  errors: string[]
}

export interface PostingValidateResult {
  valid: boolean
  coa_version_id: string
  global_errors: string[]
  lines: PostingValidateLine[]
}

/** Body for the validate call — mirror of the posting `PostingLine` fields
 * the FE is allowed to set on the manual (account_code) path. */
export interface PostingValidateInput {
  accounting_date: string
  currency_code: string
  document_type: string
  lines: {
    line_no: number
    direction: PostingDirection
    amount_minor: number
    account_code: string
    coa_version?: string
    description?: string
  }[]
}

export type ValidateFn = (input: PostingValidateInput) => Promise<PostingValidateResult>

/** Labels for `EntryLinesGrid` — supplied by the consumer's locale. */
export interface EntryLinesGridLabels {
  colNo: string
  colDirection: string
  colAccount: string
  colAccountName: string
  colAmount: string
  colDescription: string
  debit: string
  credit: string
  addRow: string
  deleteRow: string
  chooseAccount: string
  /** Totals footer; when `balancedBadge` is set the double-entry pages show it. */
  totalDebit: string
  totalCredit: string
  /** Labels forwarded to the account picker dialog opened from a row. */
  accountDialog: ChooseAccountDialogLabels
}

/** Labels for `ChooseAccountDialog`. */
export interface ChooseAccountDialogLabels {
  title: string
  searchPlaceholder: string
  colCode: string
  colName: string
  colCurrency: string
  empty: string
  prev: string
  next: string
  pageOf: string
  close: string
}

/** Labels for `PostingPreviewPanel`. */
export interface PostingPreviewPanelLabels {
  title: string
  description?: string
  resolving: string
  valid: string
  invalid: string
  /** Shown when the result predates the latest row edit. */
  stale: string
  unresolved: string
  coaVersion: string
  globalErrors: string
  colNo: string
  colDirection: string
  colAccount: string
  colAmount: string
  colErrors: string
  validateFailed: string
}

/** Labels for the shell cards — EPAS FAC headings + the fixed read-only
 * control fields (Đơn vị / Trạng thái / Ngày nhập / Người nhập). */
export interface PostingFlowShellLabels {
  transactionTitle: string
  controlTitle: string
  controlUnit: string
  controlStatus: string
  controlEnteredAt: string
  controlEnteredBy: string
}
