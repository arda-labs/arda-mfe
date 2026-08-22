import { registerResourceBundles } from "@workspace/i18n"
import enAdmin from "../locales/en-US/admin.json"
import enCommon from "../locales/en-US/common.json"
import enWorkflow from "../locales/en-US/workflow.json"
import viAdmin from "../locales/vi-VN/admin.json"
import viCommon from "../locales/vi-VN/common.json"
import viWorkflow from "../locales/vi-VN/workflow.json"

registerResourceBundles({
  "vi-VN": { common: viCommon, admin: viAdmin, workflow: viWorkflow },
  "en-US": { common: enCommon, admin: enAdmin, workflow: enWorkflow },
})
