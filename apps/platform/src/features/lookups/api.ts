import { deleteCanonical, getCanonical, postCanonical } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"
import type { LookupCategory, LookupValue } from "./types"

export const lookupsApi = {
  // Lookup Categories
  listLookupCategories: (params?: { scopeType?: string; scopeId?: string }) => {
    const q = buildSearchParams({
      scope_type: params?.scopeType,
      scope_id: params?.scopeId,
    })
    return getCanonical<LookupCategory[]>(
      `/api/platform/lookups?${q.toString()}`
    )
  },
  upsertLookupCategory: (data: Partial<LookupCategory>) => {
    return postCanonical<LookupCategory>("/api/platform/lookups", data)
  },
  deleteLookupCategory: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(
      `/api/platform/lookups/${id}/delete`
    )
  },

  // Lookup Values
  listLookupValues: (categoryCode: string) => {
    return getCanonical<LookupValue[]>(
      `/api/platform/lookups/${categoryCode}/values`
    )
  },
  createLookupValue: (categoryCode: string, data: Partial<LookupValue>) => {
    return postCanonical<LookupValue>(
      `/api/platform/lookups/${categoryCode}/values`,
      data
    )
  },
  upsertLookupValue: (categoryCode: string, data: Partial<LookupValue>) => {
    return postCanonical<LookupValue>(
      `/api/platform/lookups/${categoryCode}/values`,
      data
    )
  },
  deleteLookupValue: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(`/api/platform/lookup-values/${id}`)
  },
}
