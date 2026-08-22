import { registerResourceBundles } from "@workspace/i18n"
import enAuth from "../locales/en-US/auth.json"
import enCommon from "../locales/en-US/common.json"
import enNavigation from "../locales/en-US/navigation.json"
import enNotifications from "../locales/en-US/notifications.json"
import enUser from "../locales/en-US/user.json"
import viAuth from "../locales/vi-VN/auth.json"
import viCommon from "../locales/vi-VN/common.json"
import viNavigation from "../locales/vi-VN/navigation.json"
import viNotifications from "../locales/vi-VN/notifications.json"
import viUser from "../locales/vi-VN/user.json"

registerResourceBundles({
  "vi-VN": {
    common: viCommon,
    auth: viAuth,
    navigation: viNavigation,
    notifications: viNotifications,
    user: viUser,
  },
  "en-US": {
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    notifications: enNotifications,
    user: enUser,
  },
})
