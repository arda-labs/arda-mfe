import { api } from "@workspace/api"
import { apiUrl } from "@workspace/api/url"

export const HYDRA_PUBLIC_URL = "https://auth.arda.io.vn"
export const OAUTH_CLIENT_ID = "arda-shell"

function getBffApi(): string {
  return apiUrl("/api/auth")
}

function getOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin
  return ""
}

export function getOAuthRedirectUri(): string {
  return `${getOrigin()}/callback`
}

export async function redirectToHydraLogin(returnTo?: string): Promise<void> {
  if (typeof window !== "undefined") {
    const next =
      returnTo ?? `${window.location.pathname}${window.location.search}`
    const authRoute =
      /^\/(auth|login|callback|login-callback|consent)(\/|$)/.test(
        window.location.pathname
      )
    const params = new URLSearchParams({ return_to: authRoute ? "/" : next })
    window.location.href = `${getBffApi()}/start?${params.toString()}`
  }
}

const EXPIRED_LOGIN_CHALLENGE_CODE = "login_challenge_expired"

const REMINT_KEY = "hydra_login_challenge_remint"
const REMINT_WINDOW_MS = 30_000
const REMINT_MAX_ATTEMPTS = 2

type RemintEntry = { at: number; count: number }

function readRemintEntry(): RemintEntry | null {
  if (typeof sessionStorage === "undefined") return null
  try {
    const raw = sessionStorage.getItem(REMINT_KEY)
    return raw ? (JSON.parse(raw) as RemintEntry) : null
  } catch {
    return null
  }
}

// Auto re-minting must never turn into a redirect loop if the authorization
// server keeps handing out challenges that instantly die, so the guard allows
// at most REMINT_MAX_ATTEMPTS attempts inside REMINT_WINDOW_MS.
export function canRemintLoginChallenge(): boolean {
  const entry = readRemintEntry()
  if (!entry || Date.now() - entry.at > REMINT_WINDOW_MS) return true
  return entry.count < REMINT_MAX_ATTEMPTS
}

export function markLoginChallengeRemint(): void {
  if (typeof sessionStorage === "undefined") return
  const entry = readRemintEntry()
  const now = Date.now()
  const next =
    !entry || now - entry.at > REMINT_WINDOW_MS
      ? { at: now, count: 1 }
      : { at: entry.at, count: entry.count + 1 }
  try {
    sessionStorage.setItem(REMINT_KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable: recovery still proceeds, just unguarded.
  }
}

export function clearLoginChallengeRemint(): void {
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.removeItem(REMINT_KEY)
  } catch {
    // Nothing to reset.
  }
}

export function isExpiredLoginChallengeError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "")
  return message.includes(EXPIRED_LOGIN_CHALLENGE_CODE)
}

export async function validateLoginChallenge(
  loginChallenge: string
): Promise<boolean | null> {
  try {
    const res = await fetch(
      apiUrl(
        `/api/auth/login-challenge/validate?login_challenge=${encodeURIComponent(loginChallenge)}`
      ),
      { credentials: "include", headers: { Accept: "application/json" } }
    )
    if (!res.ok) return null
    const data = (await res.json()) as { valid?: boolean }
    return typeof data.valid === "boolean" ? data.valid : null
  } catch {
    return null
  }
}

export async function acceptHydraConsent(
  consentChallenge: string
): Promise<string> {
  const data = await api.post<{ redirect_url?: string }>(
    "/api/auth/accept-consent",
    {
      consent_challenge: consentChallenge,
      remember: true,
    }
  )
  if (!data.redirect_url)
    throw new Error("accept consent returned empty redirect_url")
  return data.redirect_url
}

export async function exchangeCode(
  code: string,
  codeVerifier: string,
  state: string
): Promise<{
  user: {
    userId: string
    subject: string
    username: string
    email: string
    picture?: string
    avatarFileId?: string
    orgIds?: string[]
  }
}> {
  return api.post("/api/auth/callback", {
      code,
      code_verifier: codeVerifier,
      state,
      redirect_uri: getOAuthRedirectUri(),
  })
}
