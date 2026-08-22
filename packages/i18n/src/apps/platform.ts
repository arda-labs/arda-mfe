import { registerResourceBundles } from "@workspace/i18n"
import enCommon from "../locales/en-US/common.json"
import enPlatform from "../locales/en-US/platform.json"
import viCommon from "../locales/vi-VN/common.json"
import viPlatform from "../locales/vi-VN/platform.json"

registerResourceBundles({
  "vi-VN": { common: viCommon, platform: viPlatform },
  "en-US": { common: enCommon, platform: enPlatform },
})
