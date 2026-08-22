import i18n from "i18next"
import ICU from "i18next-icu"
import { initReactI18next } from "react-i18next"

export const supportedLocales = ["vi-VN", "en-US"] as const
export type Locale = (typeof supportedLocales)[number]
export const defaultLocale: Locale = "vi-VN"
export const STORAGE_KEY = "arda-locale"

export type ResourceBundles = Record<
  Locale,
  Record<string, Record<string, unknown>>
>

if (!i18n.isInitialized) {
  i18n
    .use(ICU)
    .use(initReactI18next)
    .init({
      resources: {},
      lng: defaultLocale,
      fallbackLng: "en-US",
      defaultNS: "common",
      interpolation: {
        escapeValue: false,
      },
    })
}

export function registerResourceBundles(resources: ResourceBundles) {
  for (const locale of supportedLocales) {
    for (const [namespace, bundle] of Object.entries(resources[locale])) {
      i18n.addResourceBundle(locale, namespace, bundle, true, true)
    }
  }
}

export { i18n }
