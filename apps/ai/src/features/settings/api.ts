import { getCanonical, postCanonical, putCanonical } from "@workspace/api"

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
