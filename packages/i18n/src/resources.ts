import enAdmin from "./locales/en-US/admin.json"
import enAuth from "./locales/en-US/auth.json"
import enCommon from "./locales/en-US/common.json"
import enFinance from "./locales/en-US/finance.json"
import enNavigation from "./locales/en-US/navigation.json"
import enNotifications from "./locales/en-US/notifications.json"
import enPlatform from "./locales/en-US/platform.json"
import enProfile from "./locales/en-US/profile.json"
import enUser from "./locales/en-US/user.json"
import enValidation from "./locales/en-US/validation.json"
import viAdmin from "./locales/vi-VN/admin.json"
import viAuth from "./locales/vi-VN/auth.json"
import viCommon from "./locales/vi-VN/common.json"
import viFinance from "./locales/vi-VN/finance.json"
import viNavigation from "./locales/vi-VN/navigation.json"
import viNotifications from "./locales/vi-VN/notifications.json"
import viPlatform from "./locales/vi-VN/platform.json"
import viProfile from "./locales/vi-VN/profile.json"
import viUser from "./locales/vi-VN/user.json"
import viValidation from "./locales/vi-VN/validation.json"

export const resources = {
  "vi-VN": {
    admin: viAdmin,
    auth: viAuth,
    common: viCommon,
    finance: viFinance,
    navigation: viNavigation,
    notifications: viNotifications,
    platform: viPlatform,
    profile: viProfile,
    user: viUser,
    validation: viValidation,
  },
  "en-US": {
    admin: enAdmin,
    auth: enAuth,
    common: enCommon,
    finance: enFinance,
    navigation: enNavigation,
    notifications: enNotifications,
    platform: enPlatform,
    profile: enProfile,
    user: enUser,
    validation: enValidation,
  },
} as const

export const namespaces = Object.keys(resources["vi-VN"])
