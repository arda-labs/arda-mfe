import { api, type ApiSuccess } from "@workspace/api"
import { type ListResponse } from "@workspace/api/list"
import { buildSearchParams } from "@workspace/api/query"
import type { TraderInfo } from "./types"

/** Kỳ kết chuyển (FAC.203.01): D = Ngày, M = Tháng, Q = Quý, Y = Năm. */
export type ClosingPeriodType = "D" | "M" | "Q" | "Y"

/** One row of GET /api/finance/closing/accounts (unpaged list envelope). */
export interface ClosingAccountRow {
  acc_code: string
  acc_name: string
  acc_purpose: "INC" | "EXP"
  acc_nature: string
  balance_minor: number
  closing_amount_minor: number
}

/** Closing body (FAC.203.01) — the BE builds the bút toán itself (INC →
 * DEBIT tài khoản thu + CREDIT đích, EXP → CREDIT tài khoản chi + DEBIT
 * đích); the FE sends only the per-account closing amounts, never lines. */
export interface ClosingRequest {
  idempotency_key?: string
  accounting_date: string
  period_type: ClosingPeriodType
  description?: string
  trader: TraderInfo
  rows: {
    acc_code: string
    acc_purpose: "INC" | "EXP"
    amount_minor: number
  }[]
}

/**
 * Closing accounts (FAC.203.01) — GET /api/finance/closing/accounts returns
 * the closable account set for one accounting date (unpaged standard list
 * envelope; read `.items`). Every returned row is closed at
 * `closing_amount_minor` — the tab-2 table is read-only, no selection.
 */
export const closingApi = {
  accounts: (accountingDate: string) =>
    api
      .get<ApiSuccess<ListResponse<ClosingAccountRow>>>(
        `/api/finance/closing/accounts?${buildSearchParams({
          accounting_date: accountingDate,
        }).toString()}`
      )
      .then((res) => res.result),
}
