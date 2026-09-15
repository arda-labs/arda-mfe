/**
 * Cross-resource wire types for the finance feature.
 * Wire source: arda-be/apps/finance-service (journal/cancellation handlers).
 */

/** Trader/object info block (Thông tin đối tượng) — FAC.201.01 / FAC.300.01. */
export interface TraderInfo {
  object_type: string
  object_code?: string
  object_name?: string
  id_number?: string
  issue_date?: string
  issue_place?: string
  address?: string
}
