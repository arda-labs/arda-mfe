import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

export const SYSTEM_SETTINGS_KEY = "system.settings"
export const BRANDING_CACHE_KEY = "arda-branding"

export type BrandingSettings = {
  appName: string
  shortName: string
  organizationName: string
  supportEmail: string
  supportPhone: string
  helpUrl: string
  loginLogoUrl: string
  dashboardLogoUrl: string
  faviconUrl: string
  loginBackgroundUrl: string
  loginBackgroundEnabled: boolean
  loginWelcomeTitle: string
  loginWelcomeSubtitle: string
}

type Parameter = {
  key: string
  value: string
}

type SystemBrandingContextValue = {
  branding: BrandingSettings
  loading: boolean
  error: Error | null
  reload: () => void
}

const SystemBrandingContext = createContext<SystemBrandingContextValue | null>(
  null
)

const publicBrandingEndpoint = "/api/platform/public/branding"
const parametersEndpoint = "/api/platform/parameters"
let brandingRequest: Promise<BrandingSettings> | null = null

export const defaultBranding: BrandingSettings = {
  appName: "Arda",
  shortName: "A",
  organizationName: "",
  supportEmail: "support@arda.io.vn",
  supportPhone: "",
  helpUrl: "",
  loginLogoUrl: "",
  dashboardLogoUrl: "",
  faviconUrl: "",
  loginBackgroundUrl: "",
  loginBackgroundEnabled: false,
  loginWelcomeTitle: "Welcome back",
  loginWelcomeSubtitle:
    "Access your secure workspace for identity, workflow, and financial operations.",
}

export function normalizeBranding(value: unknown): BrandingSettings {
  if (!value || typeof value !== "object") return defaultBranding
  const raw = value as Partial<Record<keyof BrandingSettings, unknown>>
  return {
    appName: readString(raw.appName, defaultBranding.appName),
    shortName: readString(raw.shortName, defaultBranding.shortName),
    organizationName: readString(
      raw.organizationName,
      defaultBranding.organizationName
    ),
    supportEmail: readString(raw.supportEmail, defaultBranding.supportEmail),
    supportPhone: readString(raw.supportPhone, defaultBranding.supportPhone),
    helpUrl: readString(raw.helpUrl, defaultBranding.helpUrl),
    loginLogoUrl: readSafeUrl(raw.loginLogoUrl),
    dashboardLogoUrl: readSafeUrl(raw.dashboardLogoUrl),
    faviconUrl: readSafeUrl(raw.faviconUrl),
    loginBackgroundUrl: readSafeUrl(raw.loginBackgroundUrl),
    loginBackgroundEnabled:
      typeof raw.loginBackgroundEnabled === "boolean"
        ? raw.loginBackgroundEnabled
        : defaultBranding.loginBackgroundEnabled,
    loginWelcomeTitle: readString(
      raw.loginWelcomeTitle,
      defaultBranding.loginWelcomeTitle
    ),
    loginWelcomeSubtitle: readString(
      raw.loginWelcomeSubtitle,
      defaultBranding.loginWelcomeSubtitle
    ),
  }
}

export function SystemBrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState(
    () => readCachedBranding() ?? defaultBranding
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadVersion, setReloadVersion] = useState(0)

  const reload = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    void readSystemBranding()
      .then((nextBranding) => {
        if (!cancelled) setBranding(nextBranding)
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason
              : new Error("Could not load branding")
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reloadVersion])

  const value = useMemo(
    () => ({ branding, loading, error, reload }),
    [branding, error, loading, reload]
  )

  return createElement(SystemBrandingContext.Provider, { value }, children)
}

export function useSystemBranding() {
  const context = useContext(SystemBrandingContext)
  if (!context) {
    throw new Error(
      "useSystemBranding must be used within SystemBrandingProvider"
    )
  }
  return context
}

export function cacheBranding(value: unknown) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(
    BRANDING_CACHE_KEY,
    JSON.stringify(normalizeBranding(value))
  )
}

export function readCachedBranding() {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY)
    return raw ? normalizeBranding(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function getBrandInitials(name: string) {
  const trimmed = name.trim()
  if (!trimmed) return defaultBranding.shortName
  return trimmed
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function isSafeBrandImageUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return true
  if (trimmed.startsWith("/")) return !trimmed.startsWith("//")
  try {
    return new URL(trimmed).protocol === "https:"
  } catch {
    return false
  }
}

function readSystemBranding() {
  if (!brandingRequest) {
    brandingRequest = fetchSystemBranding().finally(() => {
      brandingRequest = null
    })
  }
  return brandingRequest
}

async function fetchSystemBranding() {
  const publicRes = await fetch(publicBrandingEndpoint, {
    credentials: "include",
    headers: { Accept: "application/json" },
  })
  if (publicRes.ok) return cacheAndReturn(await publicRes.json())

  const res = await fetch(parametersEndpoint, {
    credentials: "include",
    headers: { Accept: "application/json" },
  })
  if (!res.ok) return defaultBranding
  const parameters = (await res.json()) as Parameter[]
  const aggregate = parameters.find(
    (param) => param.key === SYSTEM_SETTINGS_KEY
  )
  if (!aggregate?.value) return defaultBranding
  try {
    return cacheAndReturn(JSON.parse(aggregate.value))
  } catch {
    return defaultBranding
  }
}

function cacheAndReturn(value: unknown) {
  const branding = normalizeBranding(value)
  cacheBranding(branding)
  return branding
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback
}

function readSafeUrl(value: unknown) {
  if (typeof value !== "string") return ""
  return isSafeBrandImageUrl(value) ? value.trim() : ""
}
