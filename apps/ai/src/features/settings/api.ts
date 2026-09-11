import {
  deleteCanonical,
  getCanonical,
  postCanonical,
  putCanonical,
} from "@workspace/api"

export interface AISettings {
  baseUrl: string
  apiKey: string
  modelId: string
  hasApiKey?: boolean
}

export interface AIProfileModel {
  id: string
  modelId: string
  label?: string
  isActive: boolean
}

export interface AIProfile {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  hasApiKey: boolean
  isActive: boolean
  models: AIProfileModel[]
}

export interface ProfileUpsertPayload {
  name: string
  baseUrl: string
  apiKey?: string
  models?: string[]
}

export interface TestConnectionRequest {
  baseUrl: string
  apiKey: string
  modelId: string
}

export interface TestConnectionResult {
  success: boolean
  latencyMs?: number
  modelId?: string
  message?: string
  error?: string
}

export async function fetchAISettings(): Promise<AISettings> {
  return getCanonical<AISettings>("/api/ai/settings")
}

export async function saveAISettings(
  settings: Partial<AISettings>
): Promise<{ saved: boolean }> {
  return putCanonical<{ saved: boolean }>("/api/ai/settings", settings)
}

export async function testAIConnection(
  payload: TestConnectionRequest
): Promise<TestConnectionResult> {
  return postCanonical<TestConnectionResult>("/api/ai/settings/test", payload)
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

export type UpdateQuotasDTO = Pick<QuotasDTO, "webhookUrl" | "monthlyTokenLimit">

export async function fetchQuotas(): Promise<QuotasDTO> {
  return getCanonical<QuotasDTO>("/api/ai/settings/quotas")
}

export async function saveQuotas(
  payload: UpdateQuotasDTO
): Promise<QuotasDTO> {
  return putCanonical<QuotasDTO>("/api/ai/settings/quotas", payload)
}
