import { api } from "@workspace/api"
import type { CatalogTool } from "./types"

export const toolsApi = {
  listTools: (domain?: string) => {
    const params = new URLSearchParams()
    if (domain && domain !== "all") params.set("domain", domain)
    const qs = params.toString()
    return api.get<CatalogTool[]>(`/api/ai/tools${qs ? `?${qs}` : ""}`)
  },
}
