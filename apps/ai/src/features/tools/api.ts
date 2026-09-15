import { api } from "@workspace/api"
import type { CatalogTool, RiskLevel, ToolKind } from "./types"

export interface ListToolsParams {
  domain?: string
  kind?: ToolKind
  risk?: RiskLevel
  enabled?: boolean
  q?: string
  limit?: number
  cursor?: number
}

/**
 * PATCH payload for one tool (ADR-003). Exactly one of the two shapes:
 * - `{ enabled: boolean }` upserts the runtime override;
 * - `{ clearOverride: true }` deletes it and returns to the contract default.
 */
export type UpdateToolPayload = { enabled: boolean } | { clearOverride: true }

export const toolsApi = {
  listTools: (params: ListToolsParams = {}) => {
    const search = new URLSearchParams()
    if (params.domain && params.domain !== "all") {
      search.set("domain", params.domain)
    }
    if (params.kind) search.set("kind", params.kind)
    if (params.risk) search.set("risk", params.risk)
    if (params.enabled !== undefined) {
      search.set("enabled", String(params.enabled))
    }
    if (params.q) search.set("q", params.q)
    if (params.limit) search.set("limit", String(params.limit))
    if (params.cursor) search.set("cursor", String(params.cursor))
    const qs = search.toString()
    return api.get<CatalogTool[]>(`/api/ai/tools${qs ? `?${qs}` : ""}`)
  },
  updateTool: (methodName: string, payload: UpdateToolPayload) =>
    api.patch<CatalogTool>(
      `/api/ai/tools/${encodeURIComponent(methodName)}`,
      payload
    ),
}
