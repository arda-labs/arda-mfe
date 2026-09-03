export type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "EXECUTED"

export interface ApprovalDetail {
  id: string
  status: ApprovalStatus
  toolName: string
  toolVersion: number
  risk: "low" | "medium" | "high"
  arguments: Record<string, unknown>
  summary?: Record<string, unknown>
  requesterUserId: string
  approverUserId?: string
  threadId: string
  runId: string
  expiresAt: string
  createdAt: string
}

export interface ConversationSummary {
  threadId: string
  title: string
  messageCount: number
  lastMessageAt?: string
  status: string
}

export interface ConversationMessage {
  sequence: number
  role: "user" | "assistant" | "system" | "tool"
  content: string
  createdAt: string
}
