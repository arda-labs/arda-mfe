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

/**
 * ai-service marshals a Go nil []string as JSON null, so tools without a
 * permission requirement (e.g. `docs.problemLookup`) arrive with
 * `requiredPermissions: null` although the catalog contract declares an
 * array. Normalize at the transport boundary — components read `.length`.
 */
export function normalizeCatalogTool(tool: CatalogTool): CatalogTool {
  return { ...tool, requiredPermissions: tool.requiredPermissions ?? [] }
}

export const toolsApi = {
  listTools: async (params: ListToolsParams = {}) => {
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
    const tools = await api.get<CatalogTool[]>(
      `/api/ai/tools${qs ? `?${qs}` : ""}`
    )
    return tools.map(normalizeCatalogTool)
  },
  updateTool: async (methodName: string, payload: UpdateToolPayload) =>
    normalizeCatalogTool(
      await api.patch<CatalogTool>(
        `/api/ai/tools/${encodeURIComponent(methodName)}`,
        payload
      )
    ),
}
