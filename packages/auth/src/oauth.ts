import { generatePKCEAsync } from "@workspace/core/browser/pkce"

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

export async function redirectToHydraLogin(): Promise<void> {
  const pkce = await generatePKCEAsync()
  if (typeof window !== "undefined") {
    sessionStorage.setItem("hydra_state", pkce.state)
    sessionStorage.setItem("hydra_code_verifier", pkce.codeVerifier)
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: getOAuthRedirectUri(),
    scope: "openid email offline_access",
    state: pkce.state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.codeChallengeMethod,
  })

  if (typeof window !== "undefined") {
    window.location.href = `${HYDRA_PUBLIC_URL}/oauth2/auth?${params.toString()}`
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
