import { getCanonical, getCanonicalList, postCanonical } from "@workspace/api"
import { listQuery } from "./list-query"

// Wire types generated from arda-be/contracts/openapi/loan-v1.json (ADR-005).
import type { LoanGeneralProvisionRow, LoanSpecificProvisionRow } from "@workspace/api/generated/loan-v1"
export type GeneralProvision = LoanGeneralProvisionRow
export type SpecificProvision = LoanSpecificProvisionRow

/** General provision (LNM.307.01). */
export const generalProvisionApi = {
  detail: (id: string) =>
    getCanonical<GeneralProvision>(
      `/api/loan/general-provisions/${encodeURIComponent(id)}`
    ),
  calculate: (body: { org_code?: string; provision_date: string }) =>
    postCanonical<GeneralProvision>(
      "/api/loan/general-provisions/calculate",
      body
    ),
  submit: (body: { org_code?: string; provision_date: string }) =>
    postCanonical<GeneralProvision>("/api/loan/general-provisions", body),
  list: (params: { org?: string } = {}) =>
    getCanonicalList<GeneralProvision>(
      `/api/loan/general-provisions?${listQuery(params).toString()}`
    ),
}

export const specificProvisionApi = {
  detail: (id: string) =>
    getCanonical<SpecificProvision>(
      `/api/loan/specific-provisions/${encodeURIComponent(id)}`
    ),
  calculate: (body: { agreement_code: string; provision_date: string }) =>
    postCanonical<SpecificProvision>(
      "/api/loan/specific-provisions/calculate",
      body
    ),
  submit: (body: { agreement_code: string; provision_date: string }) =>
    postCanonical<SpecificProvision>("/api/loan/specific-provisions", body),
  list: (params: { status?: string } = {}) =>
    getCanonicalList<SpecificProvision>(
      `/api/loan/specific-provisions?${listQuery(params).toString()}`
    ),
}
