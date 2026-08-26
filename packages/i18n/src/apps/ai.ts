import { registerResourceBundles } from "@workspace/i18n"
import enAi from "../locales/en-US/ai.json"
import viAi from "../locales/vi-VN/ai.json"

registerResourceBundles({
  "vi-VN": { ai: viAi },
  "en-US": { ai: enAi },
})
