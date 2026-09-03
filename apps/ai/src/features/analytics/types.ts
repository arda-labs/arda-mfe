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
  costUsd: number
  errors: number
}

export interface ModelCost {
  modelId: string
  provider: string
  runs: number
  tokens: number
  costUsd: number
}

export interface AnalyticsSummary {
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  successRate: number
  totalTokens: number
  promptTokens: number
  completionTokens: number
  estimatedCostUsd: number
  latency: LatencyStats
  feedback: FeedbackStats
  ragQuality: RAGQualityStats
  runsByDay: DayTrend[]
  costByModel: ModelCost[]
}
