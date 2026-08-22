import { registerResourceBundles } from "@workspace/i18n"
import enCommon from "../locales/en-US/common.json"
import enFinance from "../locales/en-US/finance.json"
import viCommon from "../locales/vi-VN/common.json"
import viFinance from "../locales/vi-VN/finance.json"

registerResourceBundles({
  "vi-VN": { common: viCommon, finance: viFinance },
  "en-US": { common: enCommon, finance: enFinance },
})
