import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import {
  defaultLocale,
  i18n,
  STORAGE_KEY,
  supportedLocales,
  registerResourceBundles,
  type Locale,
  type ResourceBundles,
} from "./config"

export { registerResourceBundles }
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
  fallbackKey: MessageKey = "common.error.unknown"
) {
  const locale = getCurrentLocale()
  const fallback = translate(fallbackKey, locale)

  if (input instanceof Error) {
    const code = (input as { code?: unknown }).code
    if (typeof code === "string" && code) {
      const translated = translate(code, locale)
      if (translated && translated !== code) return translated
    }
    return translate(input.message, locale) || input.message || fallback
  }
  if (input && typeof input === "object" && "code" in input) {
    const code = String((input as { code?: unknown }).code ?? "")
    return translate(code, locale) || fallback
  }
  return fallback
}

function translate(
  key: string,
  locale: Locale,
  params?: Record<string, string | number>
) {
  const nextKey = normalizeKey(key)
  const translated = i18n.t(nextKey, {
    lng: locale,
    ...params,
    defaultValue: "",
  })
  if (translated) return translated

  return key
}

function normalizeKey(key: string) {
  if (key.includes(":")) return key
  if (key.startsWith("nav.")) {
    return `navigation:${normalizeNavigationKey(key.slice(4))}`
  }
  const firstDot = key.indexOf(".")
  if (firstDot < 0) return key
  const namespace = key.slice(0, firstDot)
  const rest = key.slice(firstDot + 1)
  if (namespace === "iam") return `iam:${rest}`
  return `${namespace}:${rest}`
}

function normalizeNavigationKey(key: string) {
  return key.replace(/^(admin|finance|platform|settings)$/, "$1._self")
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
