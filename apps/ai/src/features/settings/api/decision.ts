import { getCanonical, postCanonical, putCanonical } from "@workspace/api"
import type { DecisionSettings, DecisionSettingsPayload, DecisionTestResult } from "../types"

export function fetchDecisionSettings() {
  return getCanonical<DecisionSettings>("/api/ai/settings/decision")
}

export function saveDecisionSettings(payload: DecisionSettingsPayload) {
  return putCanonical<DecisionSettings>("/api/ai/settings/decision", payload)
}

export function testDecisionSettings(payload: DecisionSettingsPayload) {
  return postCanonical<DecisionTestResult>("/api/ai/settings/decision/test", payload)
}
