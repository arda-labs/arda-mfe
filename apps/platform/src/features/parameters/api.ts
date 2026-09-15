import { deleteCanonical, getCanonical, postCanonical } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"
import type { Parameter } from "./types"

export const parametersApi = {
  listParameters: (params?: { scopeType?: string; scopeId?: string }) => {
    const q = buildSearchParams({
      scope_type: params?.scopeType,
      scope_id: params?.scopeId,
    })
    return getCanonical<Parameter[]>(`/api/platform/parameters?${q.toString()}`)
  },
  upsertParameter: (data: Partial<Parameter>) => {
    return postCanonical<Parameter>("/api/platform/parameters", data)
  },
  deleteParameter: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(`/api/platform/parameters/${id}`)
  },
}
