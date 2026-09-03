import { api } from "@workspace/api"
import type { AgentConfig } from "./types"

export const agentsApi = {
  listAgents: () => api.get<AgentConfig[]>("/api/ai/agents"),
  saveAgent: (agent: Partial<AgentConfig>) =>
    api.post<AgentConfig>("/api/ai/agents", agent),
  deleteAgent: (id: string) =>
    api.delete<{ deleted: boolean }>(`/api/ai/agents/${id}`),
}
