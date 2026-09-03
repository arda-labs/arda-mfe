import { api } from "@workspace/api"
import type { AnalyticsSummary } from "./types"

export const analyticsApi = {
  getOverview: () => api.get<AnalyticsSummary>("/api/ai/analytics/overview"),
}
