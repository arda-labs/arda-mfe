import { api, type ApiSuccess } from "@workspace/api"

export interface AISettings {
  providerType: string
  baseUrl: string
  apiKey: string
  modelId: string
  temperature: number
  isActive: boolean
  hasApiKey?: boolean
}

export interface TestConnectionRequest {
  providerType: string
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
  const response = await api.get<ApiSuccess<AISettings>>("/api/ai/settings")
  return response.result
}

export async function saveAISettings(settings: Partial<AISettings>): Promise<void> {
  await api.put<ApiSuccess<{ saved: boolean }>>("/api/ai/settings", settings)
}

export async function testAIConnection(payload: TestConnectionRequest): Promise<TestConnectionResult> {
  const response = await api.post<ApiSuccess<TestConnectionResult>>("/api/ai/settings/test", payload)
  return response.result
}

export interface AISettingProfile {
  id: string
  name: string
  providerType: string
  baseUrl: string
  apiKey: string
  modelId: string
  temperature: number
  isActive: boolean
}

export async function listAIProfiles(): Promise<AISettingProfile[]> {
  const response = await api.get<ApiSuccess<AISettingProfile[]>>("/api/ai/settings/profiles")
  return response.result ?? []
}

export async function createAIProfile(payload: {
  name: string
  providerType: string
  baseUrl: string
  apiKey: string
  modelId: string
  temperature: number
  isActive?: boolean
}): Promise<{ id: string }> {
  const response = await api.post<ApiSuccess<{ id: string }>>("/api/ai/settings/profiles", payload)
  return response.result
}

export async function activateAIProfile(id: string): Promise<{ id: string; name: string; baseUrl: string; modelId: string }> {
  const response = await api.post<ApiSuccess<{ id: string; name: string; baseUrl: string; modelId: string }>>(
    `/api/ai/settings/profiles/${encodeURIComponent(id)}/activate`
  )
  return response.result
}

export async function deleteAIProfile(id: string): Promise<void> {
  await api.delete(`/api/ai/settings/profiles/${encodeURIComponent(id)}`)
}
