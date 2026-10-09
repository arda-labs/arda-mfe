import type { AIApiFormat } from "./api"

export const API_FORMATS: AIApiFormat[] = [
  "chat_completions",
  "anthropic_messages",
  "openai_responses",
  "google_gemini",
]

// Endpoint each API format calls, shown as a compact badge.
export const API_FORMAT_PATH: Record<AIApiFormat, string> = {
  chat_completions: "/chat/completions",
  anthropic_messages: "/v1/messages",
  openai_responses: "/responses",
  google_gemini: "/models/{model}",
}

// Thinking-token budget bounds (mirrors ai-service model.ValidReasoningBudget).
export const MIN_REASONING_BUDGET = 1024
export const MAX_REASONING_BUDGET = 64000

// Formats whose reasoning is configured with a token budget.
export const BUDGET_FORMATS: AIApiFormat[] = [
  "anthropic_messages",
  "google_gemini",
]

/**
 * Guesses the wire format a model ID is served on by multi-protocol gateways
 * (OpenCode Zen sends Claude to /v1/messages, GPT-5.x and Grok to /responses,
 * Gemini to /models/{id}, everything else to chat completions). Mirrors
 * ai-service model.SuggestAPIFormat; the server returns the same hint for
 * stored models, this copy serves models still being typed in the dialog.
 * It is a hint only: a first-party endpoint may offer another protocol.
 */
export function suggestApiFormat(modelId: string): AIApiFormat {
  let id = modelId.trim().toLowerCase()
  const slash = id.lastIndexOf("/")
  if (slash >= 0) id = id.slice(slash + 1)
  if (id.startsWith("claude-")) return "anthropic_messages"
  if (id.startsWith("gemini-")) return "google_gemini"
  if (
    id.startsWith("gpt-5") ||
    id.startsWith("gpt-6") ||
    id.startsWith("grok-") ||
    id.startsWith("muse-") ||
    id.startsWith("o1") ||
    id.startsWith("o3") ||
    id.startsWith("o4") ||
    id.includes("codex")
  ) {
    return "openai_responses"
  }
  return "chat_completions"
}
