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
import enValidation from "./locales/en-US/validation.json"
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
import viValidation from "./locales/vi-VN/validation.json"
import viWorkflow from "./locales/vi-VN/workflow.json"

export const resources = {
  "vi-VN": {
    admin: viAdmin,
    auth: viAuth,
    common: viCommon,
    crm: viCrm,
    finance: viFinance,
    iam: viIam,
    navigation: viNavigation,
    notifications: viNotifications,
    platform: viPlatform,
    profile: viProfile,
    user: viUser,
    validation: viValidation,
    workflow: viWorkflow,
  },
  "en-US": {
    admin: enAdmin,
    auth: enAuth,
    common: enCommon,
    crm: enCrm,
    finance: enFinance,
    iam: enIam,
    navigation: enNavigation,
    notifications: enNotifications,
    platform: enPlatform,
    profile: enProfile,
    user: enUser,
    validation: enValidation,
    workflow: enWorkflow,
  },
} as const

export const namespaces = Object.keys(resources["vi-VN"])
