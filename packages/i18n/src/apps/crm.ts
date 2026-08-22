import { registerResourceBundles } from "@workspace/i18n"
import enCommon from "../locales/en-US/common.json"
import enCrm from "../locales/en-US/crm.json"
import viCommon from "../locales/vi-VN/common.json"
import viCrm from "../locales/vi-VN/crm.json"

registerResourceBundles({
  "vi-VN": { common: viCommon, crm: viCrm },
  "en-US": { common: enCommon, crm: enCrm },
})
