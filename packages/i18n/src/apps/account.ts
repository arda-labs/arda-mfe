import { registerResourceBundles } from "@workspace/i18n"
import enCommon from "../locales/en-US/common.json"
import enProfile from "../locales/en-US/profile.json"
import enUser from "../locales/en-US/user.json"
import viCommon from "../locales/vi-VN/common.json"
import viProfile from "../locales/vi-VN/profile.json"
import viUser from "../locales/vi-VN/user.json"

registerResourceBundles({
  "vi-VN": { common: viCommon, profile: viProfile, user: viUser },
  "en-US": { common: enCommon, profile: enProfile, user: enUser },
})
