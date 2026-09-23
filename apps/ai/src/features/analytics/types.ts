export interface LatencyStats {
  p50Ms: number
  p95Ms: number
  p99Ms: number
  avgMs: number
}

export interface FeedbackStats {
  total: number
  positive: number
  negative: number
  satisfactionRate: number
}

export interface RAGQualityStats {
  groundednessScore: number
  faithfulnessScore: number
  retrievalPrecision: number
}

export interface DayTrend {
  date: string
  runs: number
  tokens: number
  errors: number
}

export interface ModelUsage {
  modelId: string
  provider: string
  runs: number
  tokens: number
}

export interface AnalyticsSummary {
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  successRate: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  latency: LatencyStats
  feedback: FeedbackStats
  ragQuality: RAGQualityStats
  runsByDay: DayTrend[]
  modelsByUsage: ModelUsage[]
  decision: {
    evaluations: number
    routed: number
    low_confidence: number
    tokens: number
    avg_latency_ms: number
    average_confidence: number
  }
  agentic: {
    tool_calls: number
    successful_calls: number
    failed_calls: number
    pending_approvals: number
    approved_actions: number
    rejected_actions: number
  }
}
