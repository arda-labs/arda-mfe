import { getCanonical, postCanonical, putCanonical } from "@workspace/api"

export interface AISettings {
  baseUrl: string
  apiKey: string
  modelId: string
  hasApiKey?: boolean
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
