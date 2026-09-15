import { defaultLocale, i18n, registerAppLocales, type Locale } from "./config"

type Bundle = Record<string, unknown>
type Loader = () => Promise<{ default: Bundle }>
export type AppLocaleLoader = {
  preload: (locale?: Locale) => Promise<void>
  read: (locale: Locale) => void
}

/** One hashed locale chunk per app/language; failures remain retryable. */
export function createAppLocaleLoader(namespace: string, loaders: Record<Locale, Loader>): AppLocaleLoader {
  const states = new Map<Locale, { promise: Promise<void>; ready: boolean; error?: unknown }>()
  const retryKey = Symbol.for("arda.lazy-retries.v1")
  const root = globalThis as typeof globalThis & { [retryKey]?: Set<() => void> }
  const retries = (root[retryKey] ??= new Set<() => void>())
  const reset = () => {
    for (const [locale, state] of states) if (state.error) states.delete(locale)
    retries.delete(reset)
  }
  function preload(locale: Locale = i18n.language === "en-US" ? "en-US" : defaultLocale) {
    const existing = states.get(locale)
    if (existing) return existing.promise
    const state = { promise: Promise.resolve(), ready: false, error: undefined as unknown }
    state.promise = loaders[locale]().then(({ default: bundle }) => {
      registerAppLocales(namespace, { [locale]: bundle })
      state.ready = true
    }).catch((error: unknown) => {
      state.error = error
      retries.add(reset)
      throw error
    })
    states.set(locale, state)
    return state.promise
  }
  return {
    preload,
    read(locale) {
      const state = states.get(locale)
      if (state?.error) throw state.error
      if (!state?.ready) throw preload(locale)
    },
  }
}
