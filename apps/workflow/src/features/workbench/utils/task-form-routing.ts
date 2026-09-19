/**
 * Case types whose owner remote has registered `./taskForms` entries. Adding a
 * case type here requires the remote to expose the module AND to register the
 * step's `formKey`; a key the registry does not know renders the unsupported
 * state instead of guessing an action set (no fallback).
 */
export const CASE_TYPE_FORM_REMOTE = {
  DPM_ADDITIONAL_V1: "deposit",
  DPM_SETTLE_V2: "deposit",
  DPM_PAY_INTEREST_V1: "deposit",
  DPM_CAPITALIZE_V1: "deposit",
  DPM_PRODUCT_REGISTER_V1: "deposit",
  DPM_PRODUCT_EDIT_V1: "deposit",
  DPM_RATE_REGISTER_V1: "deposit",
  DPM_RATE_EDIT_V1: "deposit",
  DPM_BATCH_INTEREST_V1: "deposit",
  IBM_PLACE_V1: "deposit",
  IBM_TOP_UP_V1: "deposit",
  IBM_INTEREST_V1: "deposit",
  IBM_EXPECTED_V1: "deposit",
  IBM_WITHDRAW_V1: "deposit",
  CFC_CONTRACT_V1: "capital",
  CFC_AMENDMENT_V1: "capital",
  CFC_MOVEMENT_V1: "capital",
} as const

export type TaskFormRemote =
  (typeof CASE_TYPE_FORM_REMOTE)[keyof typeof CASE_TYPE_FORM_REMOTE]

export function taskFormRemoteFor(
  caseType?: string
): TaskFormRemote | undefined {
  if (!caseType) return undefined
  return CASE_TYPE_FORM_REMOTE[caseType as keyof typeof CASE_TYPE_FORM_REMOTE]
}
