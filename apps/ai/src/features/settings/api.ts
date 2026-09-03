import { deleteCanonical, getCanonical, postCanonical, putCanonical } from "@workspace/api"

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

export interface ProfileDTO {
  id?: string
  name: string
  providerType: string
  baseUrl: string
  apiKey?: string
  modelId: string
  temperature: number
  isActive?: boolean
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

export async function listProfiles(): Promise<ProfileDTO[]> {
  return getCanonical<ProfileDTO[]>("/api/ai/settings/profiles")
}

export async function createProfile(
  payload: ProfileDTO
): Promise<ProfileDTO> {
  return postCanonical<ProfileDTO>("/api/ai/settings/profiles", payload)
}

export async function deleteProfile(id: string): Promise<void> {
  return deleteCanonical<void>(`/api/ai/settings/profiles/${id}`)
}

export async function activateProfile(id: string): Promise<ProfileDTO> {
  return postCanonical<ProfileDTO>(`/api/ai/settings/profiles/${id}/activate`, {})
}
