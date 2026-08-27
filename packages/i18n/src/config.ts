import i18n from "i18next"
import ICU from "i18next-icu"
import { initReactI18next } from "react-i18next"

import enAdmin from "./locales/en-US/admin.json"
import enAuth from "./locales/en-US/auth.json"
import enCommon from "./locales/en-US/common.json"
import enNavigation from "./locales/en-US/navigation.json"
import enNotifications from "./locales/en-US/notifications.json"
import enProfile from "./locales/en-US/profile.json"
import enUser from "./locales/en-US/user.json"
import enValidation from "./locales/en-US/validation.json"

import viAdmin from "./locales/vi-VN/admin.json"
import viAuth from "./locales/vi-VN/auth.json"
import viCommon from "./locales/vi-VN/common.json"
import viNavigation from "./locales/vi-VN/navigation.json"
import viNotifications from "./locales/vi-VN/notifications.json"
import viProfile from "./locales/vi-VN/profile.json"
import viUser from "./locales/vi-VN/user.json"
import viValidation from "./locales/vi-VN/validation.json"

export const supportedLocales = ["vi-VN", "en-US"] as const
export type Locale = (typeof supportedLocales)[number]
export const defaultLocale: Locale = "vi-VN"
export const STORAGE_KEY = "arda-locale"

export type ResourceBundles = Record<
  Locale,
  Record<string, Record<string, unknown>>
>

const coreResources = {
  "vi-VN": {
    admin: viAdmin,
    auth: viAuth,
    common: viCommon,
    navigation: viNavigation,
    notifications: viNotifications,
    profile: viProfile,
    user: viUser,
    validation: viValidation,
  },
  "en-US": {
    admin: enAdmin,
    auth: enAuth,
    common: enCommon,
    navigation: enNavigation,
    notifications: enNotifications,
    profile: enProfile,
    user: enUser,
    validation: enValidation,
  },
}

if (!i18n.isInitialized) {
  i18n
    .use(ICU)
    .use(initReactI18next)
    .init({
      resources: coreResources,
      lng: defaultLocale,
      fallbackLng: "en-US",
      defaultNS: "common",
      interpolation: {
        escapeValue: false,
      },
      missingKeyHandler: (lng, ns, key) => {
        const isDev = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === "development"
        if (isDev) {
          console.warn(`[i18n] Missing translation key: [${lng}] ${ns}:${key}`)
        }
      },
    })
}

export function registerResourceBundles(resources: ResourceBundles) {
  for (const locale of supportedLocales) {
    if (!resources[locale]) continue
    for (const [namespace, bundle] of Object.entries(resources[locale])) {
      i18n.addResourceBundle(locale, namespace, bundle, true, true)
    }
  }
}

export function registerAppLocales(
  namespace: string,
  bundles: Record<Locale, Record<string, unknown>>
) {
  for (const locale of supportedLocales) {
    if (bundles[locale]) {
      i18n.addResourceBundle(locale, namespace, bundles[locale], true, true)
    }
  }
}

const loadedUrls = new Set<string>()

/**
 * Dynamically fetches a locale bundle from Cloudflare Edge Assets / CDN
 * URL pattern: /mfes/${appName}/locales/${locale}.json
 */
export async function loadRemoteAppLocale(
  appName: string,
  locale: Locale = defaultLocale
): Promise<void> {
  const url = `/mfes/${appName}/locales/${locale}.json`
  if (loadedUrls.has(url)) return
  loadedUrls.add(url)

  try {
    if (typeof fetch === "function") {
      const res = await fetch(url, {
        credentials: "include",
      })
      if (res.ok) {
        const bundle = (await res.json()) as Record<string, unknown>
        i18n.addResourceBundle(locale, appName, bundle, true, true)
      }
    }
  } catch (err) {
    // In dev or offline mode, falls back to pre-registered resources
    console.debug(`[i18n] Remote fetch fallback for ${url}:`, err)
  }
}

export { i18n }
