function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"
  let result = ""
  const randomValues = new Uint32Array(length)
  crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return base64UrlEncode(digest)
}

export interface PKCE {
  state: string
  codeVerifier: string
  codeChallenge: string
  codeChallengeMethod: "S256"
}

export function generatePKCE(): PKCE {
  const state = generateRandomString(32)
  const codeVerifier = generateRandomString(64)
  return {
    state,
    codeVerifier,
    codeChallenge: "",
    codeChallengeMethod: "S256",
  }
}

export async function generatePKCEAsync(): Promise<PKCE> {
  const pkce = generatePKCE()
  pkce.codeChallenge = await generateCodeChallenge(pkce.codeVerifier)
  return pkce
}

export function parseTokenHash(hash: string): Record<string, string> {
  const params: Record<string, string> = {}
  const clean = hash.replace(/^#/, "")
  if (!clean) return params
  const search = new URLSearchParams(clean)
  search.forEach((value, key) => {
    params[key] = value
  })
  return params
}

export function parseTokenSearch(search: string): Record<string, string> {
  const params: Record<string, string> = {}
  const s = new URLSearchParams(search)
  s.forEach((value, key) => {
    params[key] = value
  })
  return params
}
