export type OlorinRole = "user" | "assistant" | "tool"

export type OlorinMessage = {
  id: string
  role: string
  content?: unknown
}

export type ToolResultPayload = Record<string, unknown>

export function messageText(content: unknown): string {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return ""
  return content
    .filter(
      (part): part is { type: "text"; text: string } =>
        typeof part === "object" &&
        part !== null &&
        "type" in part &&
        part.type === "text" &&
        "text" in part &&
        typeof part.text === "string"
    )
    .map((part) => part.text)
    .join("")
}

export function parseToolResult(
  message: OlorinMessage
): ToolResultPayload | undefined {
  if (message.role !== "tool") return undefined
  const raw = messageText(message.content)
  if (!raw.trim()) return undefined
  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return undefined
    }
    return parsed as ToolResultPayload
  } catch {
    return undefined
  }
}

export function textValue(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value : fallback
}

export type ApprovalProposalView = {
  id: string
  status: string
  expiresAt?: string
}

export function extractApprovalProposal(
  result: ToolResultPayload
): ApprovalProposalView | undefined {
  const candidates = [
    result.approval,
    result.proposal,
    isApprovalShaped(result) ? result : undefined,
  ]
  for (const candidate of candidates) {
    const view = toApprovalProposal(candidate)
    if (view) return view
  }
  return undefined
}

function isApprovalShaped(value: unknown): value is ToolResultPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "status" in value &&
    "expiresAt" in value
  )
}

function toApprovalProposal(
  value: unknown
): ApprovalProposalView | undefined {
  if (typeof value !== "object" || value === null) return undefined
  const record = value as Record<string, unknown>
  const id = textValue(record.id)
  const status = textValue(record.status)
  if (!id || !status) return undefined
  return {
    id,
    status,
    expiresAt: textValue(record.expiresAt) || undefined,
  }
}
