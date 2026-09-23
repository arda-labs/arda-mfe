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
}

export interface AIProfile {
  id: string
  name: string
  providerType: AIProviderType
  baseUrl: string
  apiKey: string
  hasApiKey: boolean
  isActive: boolean
  models: AIProfileModel[]
}

export type AIProviderType =
  "openai" | "openai-compatible" | "opencode-go" | "ollama" | "vllm"

export interface ProfileUpsertPayload {
  name: string
  providerType: AIProviderType
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
  models: string[]
): Promise<AIProfile> {
  const res = await postCanonical<{ profile: AIProfile }>(
    `/api/ai/settings/profiles/${encodeURIComponent(id)}/models`,
    { models }
  )
  return res.profile
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
