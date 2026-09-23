// Source: arda-be/apps/ai-service/internal/handler/decision_settings.go
export interface DecisionSettings {
  enabled: boolean
  model_id: "jev-1.13-free" | "jev-1.13"
  min_confidence: number
  has_api_key: boolean
  provider: "opencode-zen"
  purpose: "decision"
}

export interface DecisionSettingsPayload {
  enabled: boolean
  model_id: DecisionSettings["model_id"]
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
