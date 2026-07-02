import { getMediaContentUrl } from "@workspace/core/media/urls"
import { translateApiError, useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { QRCode, QRCodeSvg } from "@workspace/ui/components/qr-code"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Languages,
  LogIn,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react"
import { toast } from "sonner"
import { useEffect, useRef, useState, type FormEvent } from "react"
import { useTheme } from "../../theme/src/index"
import { acceptHydraConsent, exchangeCode, redirectToHydraLogin } from "./oauth"
import { normalizeAuthUser, useAuthStore } from "./store"

function getSearch() {
  if (typeof window === "undefined") return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

export function LoginPage() {
  const search = getSearch()
  const loginChallenge = search.get("login_challenge") || ""
  const searchError = search.get("error") || ""
  const { isAuthenticated, user } = useAuthStore()
  const { locale, setLocale, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const [error, setError] = useState<string | null>(() => searchError || null)
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaEnrollmentRequired, setMfaEnrollmentRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState("")
  const [kratosSessionToken, setKratosSessionToken] = useState("")
  const [mfaSecret, setMfaSecret] = useState("")
  const [mfaOTPAuthURL, setMfaOTPAuthURL] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [pendingRedirectURL, setPendingRedirectURL] = useState("")
  const isDarkMode =
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : theme === "dark"

  useEffect(() => {
    if (searchError) {
      toast.error("Lỗi xác thực", { description: searchError })
    }
  }, [searchError])

  useEffect(() => {
    if (isAuthenticated && user) window.location.href = "/"
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!loginChallenge && !isAuthenticated) redirectToHydraLogin()
  }, [loginChallenge, isAuthenticated])

  if (!loginChallenge) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" style={{ minHeight: "100dvh" }}>
        <Card>
          <CardContent className="p-8">
            <Spinner className="mx-auto size-8" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (isPending) return
    setError(null)
    setIsPending(true)
    try {
      if (mfaRequired || mfaEnrollmentRequired) {
        const result = await acceptKratosLogin(loginChallenge, kratosSessionToken, mfaCode)
        if (result.backup_codes?.length && result.redirect_url) {
          setBackupCodes(result.backup_codes)
          setPendingRedirectURL(result.redirect_url)
        }
        return
      }
      const flow = await createKratosLoginFlow()
      if (flow.sessionAlreadyAvailable) {
        const result = await acceptKratosLogin(loginChallenge, "")
        handleMFAResult(result, "")
        return
      }
      const csrfToken = getKratosCsrfToken(flow)
      const submitUrl = `/api/kratos/login?flow=${encodeURIComponent(flow.id)}`
      const res = await fetch(submitUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "password",
          identifier: username,
          password,
          csrf_token: csrfToken,
        }),
      })
      if (!res.ok) {
        const err = await readJsonResponse(res, "auth.login.error.failed")
        const flowError = getKratosFlowError(err)
        if (flowError) throw new Error(flowError)
        throw new Error(err.error?.code ?? err.error ?? "auth.login.error.failed")
      }
      const loginResult = await readJsonResponse(res, "auth.login.error.failed")
      const flowError = getKratosFlowError(loginResult)
      if (flowError) throw new Error(flowError)
      const sessionToken = loginResult.session_token || ""
      if (!sessionToken) throw new Error("auth.login.error.failed")
      const result = await acceptKratosLogin(loginChallenge, sessionToken)
      handleMFAResult(result, sessionToken)
    } catch (err) {
      setError(translateApiError(err, "auth.login.error.failed"))
    } finally {
      setIsPending(false)
    }
  }

  const handleMFAResult = (result: AcceptKratosLoginResult, sessionToken: string) => {
    if (result.mfa_required) {
      setKratosSessionToken(sessionToken)
      setMfaRequired(true)
      return
    }
    if (result.mfa_enrollment_required) {
      setKratosSessionToken(sessionToken)
      setMfaEnrollmentRequired(true)
      setMfaSecret(result.secret || "")
      setMfaOTPAuthURL(result.otpauth_url || "")
    }
  }

  if (backupCodes.length > 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground" style={{ minHeight: "100dvh" }}>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Save your backup codes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Store these somewhere safe. Each code can be used once if you lose your authenticator.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
              {backupCodes.map((backupCode) => (
                <div key={backupCode} className="rounded-md border bg-muted/30 p-2 text-center">
                  {backupCode}
                </div>
              ))}
            </div>
            <Button className="w-full" onClick={() => (window.location.href = pendingRedirectURL || "/")}>
              Continue
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground" style={{ minHeight: "100dvh" }}>
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Arda</p>
            <p className="mt-1 text-xs text-muted-foreground">Secure workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            aria-label={t("common.action.toggle_theme")}
            className="flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() =>
              setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")
            }
            type="button"
          >
            {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <button
            aria-label={locale === "vi-VN" ? "Switch to English" : "Chuyen sang tieng Viet"}
            className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setLocale(locale === "vi-VN" ? "en-US" : "vi-VN")}
            type="button"
          >
            <Languages className="size-4" />
            {locale === "vi-VN" ? "VI" : "EN"}
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-4 sm:px-6">
        <div className="grid w-full overflow-hidden rounded-lg border bg-card shadow-sm lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="hidden bg-muted/35 p-8 lg:flex lg:flex-col lg:justify-between">
            <div className="max-w-md space-y-4">
              <div className="inline-flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                Identity access
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold leading-tight">Welcome back to Arda.</h1>
                <p className="text-sm leading-6 text-muted-foreground">
                  One secure session for platform, IAM, finance, and account operations.
                </p>
              </div>
            </div>
            <div className="grid max-w-md gap-3 text-sm text-muted-foreground">
              {["OAuth2 authorization", "Kratos identity", "Hydra consent"].map((item) => (
                <div className="flex items-center gap-2" key={item}>
                  <CheckCircle2 className="size-4 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-8">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="space-y-2 px-0 pb-5 pt-0">
                <CardTitle className="text-2xl">{t("auth.login.title")}</CardTitle>
                <p className="text-sm text-muted-foreground">Use your account credentials to continue.</p>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <form className="space-y-4" onSubmit={handleLogin}>
                  {error && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {mfaEnrollmentRequired ? (
                    <div className="space-y-4">
                      <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                        Admin access requires two-factor authentication. Scan the QR code, then enter the 6-digit code.
                      </div>
                      {mfaOTPAuthURL && (
                        <div className="flex justify-center">
                          <div className="rounded-md border bg-white p-4">
                            <QRCode value={mfaOTPAuthURL} size={176} level="M" margin={0}>
                              <QRCodeSvg />
                            </QRCode>
                          </div>
                        </div>
                      )}
                      <FormField label="Manual setup key">
                        <Input readOnly className="font-mono text-xs" value={mfaSecret} />
                      </FormField>
                      <FormField label="Verification code">
                        <Input
                          autoComplete="one-time-code"
                          autoFocus
                          inputMode="numeric"
                          maxLength={6}
                          onChange={(e) => setMfaCode(e.target.value)}
                          placeholder="6-digit code"
                          value={mfaCode}
                        />
                      </FormField>
                    </div>
                  ) : mfaRequired ? (
                    <FormField label="Verification code">
                      <Input
                        autoComplete="one-time-code"
                        autoFocus
                        inputMode="numeric"
                        maxLength={6}
                        onChange={(e) => setMfaCode(e.target.value)}
                        placeholder="6-digit code"
                        value={mfaCode}
                      />
                    </FormField>
                  ) : (
                    <>
                      <FormField label={t("auth.login.field.username")}>
                        <Input
                          autoComplete="username"
                          autoFocus
                          onChange={(e) => setUsername(e.target.value)}
                          type="text"
                          value={username}
                        />
                      </FormField>
                      <FormField label={t("auth.login.field.password")}>
                        <div className="relative">
                          <Input
                            autoComplete="current-password"
                            className="pr-10"
                            onChange={(e) => setPassword(e.target.value)}
                            type={showPassword ? "text" : "password"}
                            value={password}
                          />
                          <button
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            onClick={() => setShowPassword((value) => !value)}
                            type="button"
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </FormField>
                    </>
                  )}
                  <Button
                    className="h-10 w-full"
                    disabled={isPending || (mfaRequired || mfaEnrollmentRequired ? mfaCode.length !== 6 : !username || !password)}
                    type="submit"
                  >
                    {isPending ? (
                      <>
                        <Spinner className="mr-2 size-4" /> {t("common.action.signing_in")}
                      </>
                    ) : mfaRequired || mfaEnrollmentRequired ? (
                      <>
                        <ShieldCheck className="mr-2 size-4" /> Verify
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 size-4" /> {t("common.action.sign_in")}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  )
}

export function CallbackPage() {
  const search = getSearch()
  const code = search.get("code") || ""
  const state = search.get("state") || ""
  const consentChallenge = search.get("consent_challenge") || ""
  const error = search.get("error") || ""
  const errorDescription = search.get("error_description") || ""
  const { login } = useAuthStore()

  useEffect(() => {
    if (error) {
      window.location.href = `/login?error=${encodeURIComponent(errorDescription || error)}`
      return
    }
    if (consentChallenge && handledConsent.current !== consentChallenge) {
      handledConsent.current = consentChallenge
      acceptHydraConsent(consentChallenge)
        .then((redirectUrl) => {
          window.location.href = redirectUrl
        })
        .catch(() => {
          window.location.href = "/login?error=consent_failed"
        })
      return
    }
    if (code && state && handledCode.current !== code) {
      handledCode.current = code
      const verifier = sessionStorage.getItem("hydra_code_verifier")
      const storedState = sessionStorage.getItem("hydra_state")
      if (state !== storedState || !verifier) {
        window.location.href = "/login?error=invalid_state"
        return
      }
      exchangeCode(code, verifier, state)
        .then(async () => {
          const meRes = await fetch("/api/auth/me", { credentials: "include" })
          if (!meRes.ok) throw new Error("failed to load current user")
          const me = await meRes.json()
          login(normalizeAuthUser(me, getMediaContentUrl))
          sessionStorage.removeItem("hydra_state")
          sessionStorage.removeItem("hydra_code_verifier")
          window.location.href = "/"
        })
        .catch(() => {
          window.location.href = "/login?error=exchange_failed"
        })
      return
    }
    if (!consentChallenge && !code) window.location.href = "/login"
  }, [code, consentChallenge, error, errorDescription, login, state])

  return <FullPageSpinner />
}

const handledCode = { current: "" }
const handledConsent = { current: "" }

export function ConsentPage() {
  const consentChallenge = getSearch().get("consent_challenge") || ""
  const done = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!consentChallenge || done.current) return
    done.current = true
    acceptHydraConsent(consentChallenge)
      .then((redirectUrl) => {
        window.location.href = redirectUrl
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "consent_failed")
      })
  }, [consentChallenge])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4" style={{ minHeight: "100dvh" }}>
        <div className="max-w-md rounded-lg border bg-background p-6 text-sm">
          <p className="font-medium">Consent flow failed</p>
          <p className="mt-2 text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return <FullPageSpinner />
}

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40" style={{ minHeight: "100dvh" }}>
      <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

async function createKratosLoginFlow() {
  const res = await fetch("/api/kratos/login/api", {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  })
  const data = await readJsonResponse(res, "auth.login.error.failed")
  if (!res.ok) {
    if (data?.error?.id === "session_already_available") {
      return { sessionAlreadyAvailable: true }
    }
    throw new Error(data?.error?.message || "auth.login.error.failed")
  }
  return data
}

type KratosMessage = {
  text?: unknown
  type?: unknown
}

type KratosNode = {
  attributes?: {
    name?: unknown
    value?: unknown
  }
  messages?: KratosMessage[]
}

type KratosFlow = {
  ui?: {
    messages?: KratosMessage[]
    nodes?: KratosNode[]
  }
}

function getKratosCsrfToken(flow: KratosFlow) {
  const nodes = Array.isArray(flow?.ui?.nodes) ? flow.ui.nodes : []
  const csrfNode = nodes.find((node) => node?.attributes?.name === "csrf_token")
  return typeof csrfNode?.attributes?.value === "string" ? csrfNode.attributes.value : ""
}

function getKratosFlowError(flow: KratosFlow) {
  const flowMessages = Array.isArray(flow?.ui?.messages) ? flow.ui.messages : []
  const nodeMessages = Array.isArray(flow?.ui?.nodes)
    ? flow.ui.nodes.flatMap((node) => (Array.isArray(node?.messages) ? node.messages : []))
    : []
  const message = [...flowMessages, ...nodeMessages].find(
    (item) => item?.type === "error" && typeof item?.text === "string"
  )
  return typeof message?.text === "string" ? message.text : ""
}

type AcceptKratosLoginResult = {
  redirect_url?: string
  mfa_required?: boolean
  mfa_enrollment_required?: boolean
  secret?: string
  otpauth_url?: string
  backup_codes?: string[]
}

async function acceptKratosLogin(
  loginChallenge: string,
  kratosSessionToken: string,
  mfaCode = ""
): Promise<AcceptKratosLoginResult> {
  const res = await fetch("/api/auth/kratos/accept-login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login_challenge: loginChallenge,
      remember: true,
      remember_for: 86400,
      kratos_session_token: kratosSessionToken,
      mfa_code: mfaCode,
    }),
  })
  if (!res.ok) {
    const err = await readJsonResponse(res, "auth.login.error.failed")
    throw new Error(err.error?.code ?? err.error ?? "auth.login.error.failed")
  }
  const data = await readJsonResponse(res, "auth.login.error.failed")
  if (data.mfa_required || data.mfa_enrollment_required || data.backup_codes?.length) return data
  if (!data.redirect_url) throw new Error("auth.login.error.empty_redirect")
  window.location.href = data.redirect_url
  return data
}

async function readJsonResponse(res: Response, fallbackError: string) {
  const contentType = res.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    await res.text().catch(() => "")
    throw new Error(fallbackError)
  }
  return res.json()
}
