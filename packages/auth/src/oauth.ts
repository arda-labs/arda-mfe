export const HYDRA_PUBLIC_URL = "https://auth.arda.io.vn"
export const OAUTH_CLIENT_ID = "arda-shell"
export const BFF_API = "/api/auth"

function getOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin
  return ""
}

export function getOAuthRedirectUri(): string {
  return `${getOrigin()}/callback`
}

export async function redirectToHydraLogin(returnTo?: string): Promise<void> {
  if (typeof window !== "undefined") {
    const next = returnTo ?? `${window.location.pathname}${window.location.search}`
    const authRoute = /^\/(auth|login|callback|login-callback|consent)(\/|$)/.test(window.location.pathname)
    const params = new URLSearchParams({ return_to: authRoute ? "/" : next })
    window.location.href = `${BFF_API}/start?${params.toString()}`
  }
}

export async function acceptHydraConsent(consentChallenge: string): Promise<string> {
  const res = await fetch(`${BFF_API}/accept-consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consent_challenge: consentChallenge,
      remember: true,
    }),
  })
  if (!res.ok) throw new Error("accept consent failed")
  const data = await res.json()
  if (!data.redirect_url) throw new Error("accept consent returned empty redirect_url")
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
  const res = await fetch(`${BFF_API}/callback`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      state,
      redirect_uri: getOAuthRedirectUri(),
    }),
  })
  if (!res.ok) throw new Error("token exchange failed")
  return res.json()
}
