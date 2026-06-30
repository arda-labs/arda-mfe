import i18n from "i18next"
import ICU from "i18next-icu"
import { initReactI18next } from "react-i18next"
import { resources, namespaces } from "./resources"

export const supportedLocales = ["vi-VN", "en-US"] as const
export type Locale = (typeof supportedLocales)[number]
export const defaultLocale: Locale = "vi-VN"
export const STORAGE_KEY = "arda-locale"

if (!i18n.isInitialized) {
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
