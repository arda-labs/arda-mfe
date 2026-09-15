import { buildSearchParams, type SearchParams } from "@workspace/api/query"

/**
 * Builds list query params. Server-paged calls (page set) never send
 * `all`; legacy fetch-all callers (dropdown lookups) keep all=true.
 */
export function listQuery(params: SearchParams = {}) {
  const search = buildSearchParams(params)
  if (params.page === undefined) search.set("all", "true")
  return search
}
