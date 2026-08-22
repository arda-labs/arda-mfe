import { registerResourceBundles } from "@workspace/i18n"
import enCommon from "../locales/en-US/common.json"
import enUser from "../locales/en-US/user.json"
import viCommon from "../locales/vi-VN/common.json"
import viUser from "../locales/vi-VN/user.json"

registerResourceBundles({
  "vi-VN": { common: viCommon, user: viUser },
  "en-US": { common: enCommon, user: enUser },
})
