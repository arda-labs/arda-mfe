import {
  deleteCanonical,
  getCanonical,
  postCanonical,
  putCanonical,
} from "@workspace/api"

export interface AIProfileModel {
  id: string
  modelId: string
  label?: string
  isActive: boolean
  /** This model's own API format; undefined means it follows the profile. */
  apiFormat?: AIApiFormat
  /** Server-side hint derived from the model ID; never applied silently. */
  suggestedApiFormat: AIApiFormat
}

/** One entry of GET /profiles/{id}/available-models; `added` = already held. */
export type AIAvailableModel = Pick<
  AIProfileModel,
  "modelId" | "suggestedApiFormat"
> & { added: boolean }

export interface AIProfile {
  id: string
  name: string
  providerType: AIProviderType
  apiFormat: AIApiFormat
  reasoningEffort: AIReasoningEffort
  /** Explicit thinking-token budget; 0 follows the reasoning effort. */
  reasoningBudgetTokens: number
  baseUrl: string
  apiKey: string
  hasApiKey: boolean
  isActive: boolean
  models: AIProfileModel[]
}

export type AIProviderType =
  "openai" | "openai-compatible" | "opencode-go" | "ollama" | "vllm"

// Wire protocol of the endpoint (mirrors ai-service model.APIFormat).
export type AIApiFormat =
  | "chat_completions"
  | "anthropic_messages"
  | "openai_responses"
  | "google_gemini"

// "" lets the provider pick; other values are sent only when chosen.
export type AIReasoningEffort = "" | "low" | "medium" | "high"

export interface ProfileUpsertPayload {
  name: string
  providerType: AIProviderType
  apiFormat: AIApiFormat
  reasoningEffort: AIReasoningEffort
  reasoningBudgetTokens: number
  baseUrl: string
  apiKey?: string
  models?: string[]
}

export interface TestConnectionResult {
  success: boolean
  latencyMs?: number
  modelId?: string
  message?: string
  error?: string
}

export async function fetchProfiles(): Promise<AIProfile[]> {
  const res = await getCanonical<{ profiles: AIProfile[] }>(
    "/api/ai/settings/profiles"
  )
  return res.profiles ?? []
}

export async function createProfile(
  payload: ProfileUpsertPayload
): Promise<AIProfile> {
  const res = await postCanonical<{ profile: AIProfile }>(
    "/api/ai/settings/profiles",
    payload
  )
  return res.profile
}

export async function updateProfile(
  id: string,
  payload: ProfileUpsertPayload
): Promise<AIProfile> {
  const res = await putCanonical<{ profile: AIProfile }>(
    `/api/ai/settings/profiles/${encodeURIComponent(id)}`,
    payload
  )
  return res.profile
}

export async function deleteProfile(id: string): Promise<void> {
  await deleteCanonical(`/api/ai/settings/profiles/${encodeURIComponent(id)}`)
}

export async function addProfileModels(
  id: string,
  models: string[],
  formats?: Record<string, AIApiFormat>
): Promise<AIProfile> {
  const res = await postCanonical<{ profile: AIProfile }>(
    `/api/ai/settings/profiles/${encodeURIComponent(id)}/models`,
    formats && Object.keys(formats).length > 0 ? { models, formats } : { models }
  )
  return res.profile
}

/** Sets one model's API format; "" clears it so the model follows the profile. */
export async function setProfileModelFormat(
  id: string,
  modelId: string,
  apiFormat: AIApiFormat | ""
): Promise<AIProfile> {
  const res = await putCanonical<{ profile: AIProfile }>(
    `/api/ai/settings/profiles/${encodeURIComponent(id)}/models/${encodeURIComponent(modelId)}`,
    { apiFormat }
  )
  return res.profile
}

/** Models the saved profile's endpoint advertises (GET {base}/models). */
export async function fetchAvailableModels(
  id: string
): Promise<{ models: AIAvailableModel[]; error?: string }> {
  return getCanonical<{ models: AIAvailableModel[]; error?: string }>(
    `/api/ai/settings/profiles/${encodeURIComponent(id)}/available-models`
  )
}

export async function deleteProfileModel(
  id: string,
  modelId: string
): Promise<void> {
  await deleteCanonical(
    `/api/ai/settings/profiles/${encodeURIComponent(id)}/models/${encodeURIComponent(modelId)}`
  )
}

export async function applyProfileModel(
  id: string,
  modelId: string
): Promise<AIProfile> {
  const res = await postCanonical<{ profile: AIProfile }>(
    `/api/ai/settings/profiles/${encodeURIComponent(id)}/apply`,
    { modelId }
  )
  return res.profile
}

export async function testProfileModel(
  id: string,
  modelId: string
): Promise<TestConnectionResult> {
  return postCanonical<TestConnectionResult>(
    `/api/ai/settings/profiles/${encodeURIComponent(id)}/test`,
    { modelId }
  )
}

export interface QuotasDTO {
  webhookUrl: string
  monthlyTokenLimit: number
  tokensUsed: number
  periodStart?: string
}

export type UpdateQuotasDTO = Pick<
  QuotasDTO,
  "webhookUrl" | "monthlyTokenLimit"
>

export async function fetchQuotas(): Promise<QuotasDTO> {
  return getCanonical<QuotasDTO>("/api/ai/settings/quotas")
}

export async function saveQuotas(payload: UpdateQuotasDTO): Promise<QuotasDTO> {
  return putCanonical<QuotasDTO>("/api/ai/settings/quotas", payload)
}

// Ask/Act configuration (wire types are snake_case, matching the service).
export interface AgentSettingsDTO {
  act_mode_enabled: boolean
  act_mode_max_risk: "low" | "medium"
}

export async function fetchAgentSettings(): Promise<AgentSettingsDTO> {
  return getCanonical<AgentSettingsDTO>("/api/ai/settings/agent")
}

export async function saveAgentSettings(
  payload: AgentSettingsDTO
): Promise<AgentSettingsDTO> {
  return putCanonical<AgentSettingsDTO>("/api/ai/settings/agent", payload)
}

export interface ConversationRetentionDTO {
  trash_retention_months: number
  maximum_months: number
}

export async function fetchConversationRetention(): Promise<ConversationRetentionDTO> {
  return getCanonical<ConversationRetentionDTO>(
    "/api/ai/settings/conversations"
  )
}

export async function saveConversationRetention(
  months: number
): Promise<ConversationRetentionDTO> {
  return putCanonical<ConversationRetentionDTO>(
    "/api/ai/settings/conversations",
    {
      trash_retention_months: months,
    }
  )
}
