import enAdmin from "./locales/en-US/admin.json"
import enAuth from "./locales/en-US/auth.json"
import enCommon from "./locales/en-US/common.json"
import enCrm from "./locales/en-US/crm.json"
import enFinance from "./locales/en-US/finance.json"
import enIam from "./locales/en-US/iam.json"
import enNavigation from "./locales/en-US/navigation.json"
import enNotifications from "./locales/en-US/notifications.json"
import enPlatform from "./locales/en-US/platform.json"
import enProfile from "./locales/en-US/profile.json"
import enUser from "./locales/en-US/user.json"
import enWorkflow from "./locales/en-US/workflow.json"
import viAdmin from "./locales/vi-VN/admin.json"
import viAuth from "./locales/vi-VN/auth.json"
import viCommon from "./locales/vi-VN/common.json"
import viCrm from "./locales/vi-VN/crm.json"
import viFinance from "./locales/vi-VN/finance.json"
import viIam from "./locales/vi-VN/iam.json"
import viNavigation from "./locales/vi-VN/navigation.json"
import viNotifications from "./locales/vi-VN/notifications.json"
import viPlatform from "./locales/vi-VN/platform.json"
import viProfile from "./locales/vi-VN/profile.json"
import viUser from "./locales/vi-VN/user.json"
import viWorkflow from "./locales/vi-VN/workflow.json"

export type I18nApp =
  | "shell"
  | "iam"
  | "platform"
  | "finance"
  | "account"
  | "hrm"
  | "workflow"
  | "crm"
  | "all"

type Namespace = Record<string, unknown>
type AppResources = Record<"vi-VN" | "en-US", Record<string, Namespace>>

function createResources(
  vi: Record<string, Namespace>,
  en: Record<string, Namespace>
): AppResources {
  return { "vi-VN": vi, "en-US": en }
}

const shellResources = createResources(
  { common: viCommon, auth: viAuth, navigation: viNavigation, user: viUser, notifications: viNotifications },
  { common: enCommon, auth: enAuth, navigation: enNavigation, user: enUser, notifications: enNotifications }
)

const iamResources = createResources(
  { common: viCommon, admin: viAdmin, iam: viIam },
  { common: enCommon, admin: enAdmin, iam: enIam }
)

const platformResources = createResources(
  { common: viCommon, platform: viPlatform },
  { common: enCommon, platform: enPlatform }
)

const financeResources = createResources(
  { common: viCommon, finance: viFinance },
  { common: enCommon, finance: enFinance }
)

const accountResources = createResources(
  { common: viCommon, profile: viProfile, user: viUser },
  { common: enCommon, profile: enProfile, user: enUser }
)

const hrmResources = createResources(
  { common: viCommon, user: viUser },
  { common: enCommon, user: enUser }
)

const workflowResources = createResources(
  { common: viCommon, admin: viAdmin, workflow: viWorkflow },
  { common: enCommon, admin: enAdmin, workflow: enWorkflow }
)

const crmResources = createResources(
  { common: viCommon, crm: viCrm },
  { common: enCommon, crm: enCrm }
)

export function resourcesForApp(app: I18nApp): AppResources {
  switch (app) {
    case "shell": return shellResources
    case "iam": return iamResources
    case "platform": return platformResources
    case "finance": return financeResources
    case "account": return accountResources
    case "hrm": return hrmResources
    case "workflow": return workflowResources
    case "crm": return crmResources
    default:
      return createResources(
        { admin: viAdmin, auth: viAuth, common: viCommon, crm: viCrm, finance: viFinance, iam: viIam, navigation: viNavigation, notifications: viNotifications, platform: viPlatform, profile: viProfile, user: viUser, workflow: viWorkflow },
        { admin: enAdmin, auth: enAuth, common: enCommon, crm: enCrm, finance: enFinance, iam: enIam, navigation: enNavigation, notifications: enNotifications, platform: enPlatform, profile: enProfile, user: enUser, workflow: enWorkflow }
      )
  }
}

export function namespacesForApp(app: I18nApp) {
  return Object.keys(resourcesForApp(app)["vi-VN"])
}
