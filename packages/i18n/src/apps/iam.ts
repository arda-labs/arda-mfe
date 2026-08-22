import { registerResourceBundles } from "@workspace/i18n"
import enAdmin from "../locales/en-US/admin.json"
import enCommon from "../locales/en-US/common.json"
import enIam from "../locales/en-US/iam.json"
import viAdmin from "../locales/vi-VN/admin.json"
import viCommon from "../locales/vi-VN/common.json"
import viIam from "../locales/vi-VN/iam.json"

registerResourceBundles({
  "vi-VN": { common: viCommon, admin: viAdmin, iam: viIam },
  "en-US": { common: enCommon, admin: enAdmin, iam: enIam },
})
