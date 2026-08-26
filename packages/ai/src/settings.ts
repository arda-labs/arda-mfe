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
