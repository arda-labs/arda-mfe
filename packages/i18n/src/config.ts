import i18n from "i18next"
import ICU from "i18next-icu"
import { initReactI18next } from "react-i18next"
import { namespacesForApp, resourcesForApp, type I18nApp } from "./app-resources"

export const supportedLocales = ["vi-VN", "en-US"] as const
export type Locale = (typeof supportedLocales)[number]
export const defaultLocale: Locale = "vi-VN"
export const STORAGE_KEY = "arda-locale"

if (!i18n.isInitialized) {
  const configuredApp = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_I18N_APP
  const app = (configuredApp || "all") as I18nApp
  const resources = resourcesForApp(app)
  const namespaces = namespacesForApp(app)
  i18n.use(ICU).use(initReactI18next).init({
    resources,
    lng: defaultLocale,
    fallbackLng: "en-US",
    defaultNS: "common",
    ns: namespaces,
    interpolation: {
      escapeValue: false,
    },
  })
}

export { i18n }
