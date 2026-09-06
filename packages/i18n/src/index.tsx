import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import {
  defaultLocale,
  i18n,
  STORAGE_KEY,
  supportedLocales,
  registerResourceBundles,
  registerAppLocales,
  loadRemoteAppLocale,
  type Locale,
  type ResourceBundles,
} from "./config"

export { registerResourceBundles, registerAppLocales, loadRemoteAppLocale }
export type { ResourceBundles }

export type MessageKey = string & {}

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (
    key: MessageKey | string,
    params?: Record<string, string | number>
  ) => string
  formatDate: (
    value: Date | string | number,
    options?: Intl.DateTimeFormatOptions
  ) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatCurrency: (value: number, currency?: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getStoredLocale)

  useEffect(() => {
    i18n.changeLanguage(locale)
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale
    }
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, locale)
    }
  }, [locale])

  const value = useMemo<I18nContextValue>(() => {
    const t = (
      key: MessageKey | string,
      params?: Record<string, string | number>
    ) => translate(key, locale, params)

    return {
      locale,
      setLocale: setLocaleState,
      t,
      formatDate: (dateValue, options) =>
        new Intl.DateTimeFormat(locale, options).format(new Date(dateValue)),
      formatNumber: (numberValue, options) =>
        new Intl.NumberFormat(locale, options).format(numberValue),
      formatCurrency: (numberValue, currency = "VND") =>
        new Intl.NumberFormat(locale, { style: "currency", currency }).format(
          numberValue
        ),
    }
  }, [locale])

  return (
    <I18nextProvider i18n={i18n}>
      <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
    </I18nextProvider>
  )
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider")
  }
  return value
}

export function getCurrentLocale(): Locale {
  return getStoredLocale()
}

export function translateApiError(
  input: unknown,
  fallbackKey: MessageKey = "common.error.unknown",
  params?: Record<string, string | number>
) {
  const locale = getCurrentLocale()
  const fallback = translate(fallbackKey, locale, params)

  if (input instanceof Error) {
    const code = (input as { code?: unknown }).code
    const errParams = (input as { params?: Record<string, string | number> }).params || params
    if (typeof code === "string" && code) {
      const translated = translate(code, locale, errParams)
      if (translated && translated !== code) return translated
    }
    return translate(input.message, locale, errParams) || input.message || fallback
  }
  if (input && typeof input === "object" && "code" in input) {
    const code = String((input as { code?: unknown }).code ?? "")
    const errParams = (input as { params?: Record<string, string | number> }).params || params
    return translate(code, locale, errParams) || fallback
  }
  return fallback
}

const KNOWN_NAMESPACES = new Set([
  "admin",
  "auth",
  "common",
  "navigation",
  "notifications",
  "profile",
  "user",
  "validation",
  "iam",
  "crm",
  "finance",
  "hrm",
  "platform",
  "workflow",
  "ai",
  "account",
  "loan",
  "mdm",
])

function translate(
  key: string,
  locale: Locale,
  params?: Record<string, string | number>
): string {
  if (!key) return ""

  const opts = {
    lng: locale,
    ...params,
    defaultValue: "",
  }

  // 1. Direct namespace key with colon (e.g. "common:feedback.save_success" or "navigation:dashboard")
  if (key.includes(":")) {
    const directRes = tryI18nTranslate(key, opts)
    if (directRes) return directRes
    return key
  }

  // 2. Navigation shorthand (e.g. "nav.dashboard", "nav.ai", "nav.admin", "nav.admin.users")
  if (key.startsWith("nav.") || key.startsWith("navigation.")) {
    const subKey = key.startsWith("nav.") ? key.slice(4) : key.slice(11)
    const navRes =
      tryI18nTranslate(`navigation:${subKey}`, opts) ||
      tryI18nTranslate(`navigation:${subKey}._self`, opts)
    if (navRes) return navRes
  }

  // 3. Known namespace dot-notation (e.g. "admin.users.field.roles" -> "admin:users.field.roles")
  const firstDot = key.indexOf(".")
  if (firstDot > 0) {
    const namespace = key.slice(0, firstDot)
    const rest = key.slice(firstDot + 1)
    if (KNOWN_NAMESPACES.has(namespace)) {
      const nsRes =
        tryI18nTranslate(`${namespace}:${rest}`, opts) ||
        tryI18nTranslate(`${namespace}:${rest}._self`, opts)
      if (nsRes) return nsRes
    }
  }

  // 4. Fallback to common namespace (e.g. "action.export_excel", "export.title", "loading")
  const commonRes =
    tryI18nTranslate(`common:${key}`, opts) ||
    tryI18nTranslate(`common:${key}._self`, opts) ||
    tryI18nTranslate(key, opts)
  if (commonRes) return commonRes

  return key
}

function tryI18nTranslate(
  formattedKey: string,
  opts: Record<string, unknown>
): string | null {
  const translated = i18n.t(formattedKey, opts)
  if (typeof translated === "string" && translated && translated !== formattedKey) {
    return translated
  }
  if (translated && typeof translated === "object") {
    const selfVal = (translated as { _self?: unknown })._self
    if (typeof selfVal === "string" && selfVal) {
      return selfVal
    }
  }
  return null
}

function getStoredLocale(): Locale {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isSupportedLocale(stored)) {
      return stored
    }
  }
  if (typeof navigator !== "undefined") {
    const match = navigator.languages.find((lang) => isSupportedLocale(lang))
    if (isSupportedLocale(match)) {
      return match
    }
  }
  return defaultLocale
}

function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && supportedLocales.includes(value as Locale)
}

export type { Locale }
export { i18n }
