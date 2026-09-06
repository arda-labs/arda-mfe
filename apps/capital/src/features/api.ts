import { getCanonicalList, postCanonical } from "@workspace/api"

export interface FundType {
  id: string
  tenant_id: string
  code: string
  name: string
  is_active: boolean
}

export interface CapitalContract {
  id: string
  tenant_id: string
  contract_code: string
  fund_type_code: string
  counterparty_code: string
  contract_date: string
  amount_minor: number
  interest_rate: number
  currency_code: string
  status: string
  org_code?: string
  workflow_case_id?: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
}

export interface CapitalMovement {
  id: string
  tenant_id: string
  contract_id: string
  movement_type: string
  amount_minor: number
  currency_code: string
  movement_date: string
  status: string
  journal_entry_id?: string
  created_by: string
  created_at?: string
}

export const capitalApi = {
  listFundTypes: () =>
    getCanonicalList<FundType>("/api/capital/fund-types"),
  listContracts: (params: { status?: string } = {}) => {
    const search = new URLSearchParams()
    if (params.status) search.set("status", params.status)
    const qs = search.toString()
    return getCanonicalList<CapitalContract>(`/api/capital/contracts${qs ? `?${qs}` : ""}`)
  },
  createContract: (body: Partial<CapitalContract>) =>
    postCanonical<CapitalContract>("/api/capital/contracts", body),
  recordMovement: (contractId: string, body: {
    movement_type: string
    amount_minor: number
    currency_code?: string
    movement_date: string
  }) =>
    postCanonical<CapitalMovement>(
      `/api/capital/contracts/${encodeURIComponent(contractId)}/movements`,
      body
    ),
}
