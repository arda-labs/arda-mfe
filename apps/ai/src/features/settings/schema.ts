import { z } from "zod"
import type { DecisionSettings } from "./types"

export const decisionSettingsSchema = z.object({
  enabled: z.boolean(),
  model_id: z.enum(["jev-1.13-free", "jev-1.13"]),
  min_confidence: z.number().min(0.5).max(1),
  api_key: z.string().max(4096).optional(),
})

export const defaultDecisionSettings: DecisionSettings = {
  enabled: false,
  model_id: "jev-1.13-free",
  min_confidence: 0.8,
  has_api_key: false,
  provider: "opencode-zen",
  purpose: "decision",
}
