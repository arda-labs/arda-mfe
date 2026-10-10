// Source: arda-be/apps/ai-service/internal/handler/decision_settings.go
export interface DecisionSettings {
  enabled: boolean
  model_id: string
  min_confidence: number
  has_api_key: boolean
  provider: DecisionProvider
  purpose: "decision"
}

// Who serves the System One model (Jev): the OpenCode Zen gateway or TypeSafe
// AI directly. Both speak POST /systemone.
export type DecisionProvider = "opencode-zen" | "typesafe"

export interface DecisionSettingsPayload {
  enabled: boolean
  provider: DecisionProvider
  model_id: string
  min_confidence: number
  api_key?: string
}

export interface DecisionTestResult {
  success: boolean
  latency_ms: number
  model_id?: string
  skill?: "general" | "report" | "loan_portfolio" | "knowledge"
  confidence?: number
  error?: string
}
