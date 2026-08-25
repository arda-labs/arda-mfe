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
