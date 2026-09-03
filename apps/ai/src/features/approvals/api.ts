import { api } from "@workspace/api"
import type {
  ApprovalDetail,
  ConversationMessage,
  ConversationSummary,
} from "./types"

export const approvalsApi = {
  listApprovals: (status?: string, limit = 50, offset = 0) => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    params.set("limit", String(limit))
    params.set("offset", String(offset))
    return api.get<ApprovalDetail[]>(`/api/ai/approvals?${params.toString()}`)
  },

  decideApproval: (approvalId: string, decision: "approve" | "reject") =>
    api.post<{ id: string; status: string; expiresAt: string }>(
      `/api/ai/approvals/${approvalId}/decision`,
      { decision }
    ),

  executeApproval: (approvalId: string) =>
    api.post<{ success: boolean; result?: unknown }>(
      `/api/ai/approvals/${approvalId}/execution`,
      {}
    ),

  listConversations: (limit = 20) =>
    api.get<{ success: boolean; result: ConversationSummary[] }>(
      `/api/ai/conversations?limit=${limit}`
    ).then((res) => res.result || []),

  getConversationMessages: (threadId: string, limit = 100) =>
    api.get<{ success: boolean; result: ConversationMessage[] }>(
      `/api/ai/conversations/${threadId}/messages?limit=${limit}`
    ).then((res) => res.result || []),
}
