import { useSystemBranding, type BrandingSettings } from "@workspace/core/branding"
import { getMediaContentUrl } from "@workspace/core/media/urls"
import { translateApiError, useI18n } from "@workspace/i18n"
import { BrandMark } from "@workspace/ui/components/brand-mark"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { QRCode, QRCodeSvg } from "@workspace/ui/components/qr-code"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@workspace/ui/components/input-otp"
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Languages,
  LogIn,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react"
import { toast } from "react-toastify"
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { useTheme } from "../../theme/src/index"
import { AuthLoadingScreen } from "./loading-screen"
import { acceptHydraConsent, exchangeCode, redirectToHydraLogin } from "./oauth"
import { normalizeAuthUser, useAuthStore } from "./store"

function getSearch() {
  if (typeof window === "undefined") return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

const LOGIN_REMEMBER_FOR_SECONDS = 30 * 24 * 60 * 60

export function LoginPage() {
  const search = getSearch()
  const loginChallenge = search.get("login_challenge") || ""
  const searchError = search.get("error") || ""
  const { isAuthenticated, user } = useAuthStore()
  const { locale, setLocale, t } = useI18n()
  const { theme, setTheme } = useTheme()
  const { branding } = useSystemBranding()
  const [error, setError] = useState<string | null>(() => searchError || null)
  const [isPending, setIsPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberLogin, setRememberLogin] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaEnrollmentRequired, setMfaEnrollmentRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState("")
  const [otpMethod, setOtpMethod] = useState<"totp" | "recovery">("totp")
  const [kratosSessionToken, setKratosSessionToken] = useState("")
  const [mfaSecret, setMfaSecret] = useState("")
  const [mfaOTPAuthURL, setMfaOTPAuthURL] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [pendingRedirectURL, setPendingRedirectURL] = useState("")
  const isDarkMode =
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : theme === "dark"

  useEffect(() => {
    if (searchError) {
      toast.error(`Lỗi xác thực: ${searchError}`)
    }
  }, [searchError])

  useEffect(() => {
    if (isAuthenticated && user) {
      window.history.pushState(null, "", "/")
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!loginChallenge && !isAuthenticated && !searchError) redirectToHydraLogin()
  }, [loginChallenge, isAuthenticated, searchError])

  if (!loginChallenge && !searchError) {
    return (
      <AuthLoadingScreen />
    )
  }

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (isPending) return
    setError(null)
    setIsPending(true)
    try {
      if (mfaRequired || mfaEnrollmentRequired) {
        const result = await acceptKratosLogin(loginChallenge, kratosSessionToken, rememberLogin, mfaCode)
        if (result.backup_codes?.length && result.redirect_url) {
          setBackupCodes(result.backup_codes)
          setPendingRedirectURL(result.redirect_url)
        }
        return
      }
      const flow = await createKratosLoginFlow()
      if (flow.sessionAlreadyAvailable) {
        const result = await acceptKratosLogin(loginChallenge, "", rememberLogin)
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
      const result = await acceptKratosLogin(loginChallenge, sessionToken, rememberLogin)
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
      <AuthFrame branding={branding}>
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold">Save your backup codes</h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Store these somewhere safe. Each code can be used once if you lose your authenticator.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((backupCode) => (
              <div key={backupCode} className="rounded-md border bg-muted/30 p-2 text-center">
                {backupCode}
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigator.clipboard
                  ?.writeText(backupCodes.join("\n"))
                  .then(() => toast.success("Backup codes copied"))
                  .catch(() => toast.error("Could not copy backup codes"))
              }
            >
              <Copy className="mr-2 size-4" /> Copy codes
            </Button>
            <Button type="button" onClick={() => (window.location.href = pendingRedirectURL || "/")}>
              Continue
            </Button>
          </div>
        </div>
      </AuthFrame>
    )
  }

  const showRetryButton = !loginChallenge && searchError
  const mfaSubmitDisabled = mfaEnrollmentRequired
    ? mfaCode.length !== 6
    : mfaRequired
      ? otpMethod === "totp"
        ? mfaCode.length !== 6
        : !mfaCode.trim()
      : !username || !password

  return (
    <AuthFrame
      branding={branding}
      actions={
        <div className="flex items-center gap-2">
          <Button
            aria-label={t("common.action.toggle_theme")}
            onClick={() =>
              setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")
            }
            size="icon-sm"
            type="button"
            variant="outline"
          >
            {isDarkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button
            aria-label={locale === "vi-VN" ? "Switch to English" : "Chuyển sang tiếng Việt"}
            onClick={() => setLocale(locale === "vi-VN" ? "en-US" : "vi-VN")}
            size="sm"
            type="button"
            variant="outline"
          >
            <Languages className="size-4" />
            {locale === "vi-VN" ? "VI" : "EN"}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-balance">
            {mfaRequired || mfaEnrollmentRequired ? "Xác thực bảo mật" : t("auth.login.title")}
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            {showRetryButton
              ? "Session establishment failed."
              : mfaRequired || mfaEnrollmentRequired
                ? "Nhập mã xác thực để tiếp tục phiên đăng nhập an toàn."
                : "Enter your credentials to access your secure workspace."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span className="font-medium leading-normal">{error}</span>
          </div>
        )}

        {showRetryButton ? (
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground leading-relaxed">
              We were unable to secure a connection with the authorization server. This may be due to an expired session or network configuration issues.
            </div>
            <Button onClick={() => redirectToHydraLogin()} className="h-10 w-full font-semibold">
              Retry Secure Sign In
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleLogin}>
            {mfaEnrollmentRequired ? (
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                  Administrator privileges require Multi-Factor Authentication. Scan the QR code with your authenticator app, then enter the 6-digit code.
                </div>
                {mfaOTPAuthURL && (
                  <div className="flex justify-center">
                    <div className="rounded-lg border bg-white p-4 shadow-card">
                      <QRCode value={mfaOTPAuthURL} size={176} level="M" margin={0}>
                        <QRCodeSvg />
                      </QRCode>
                    </div>
                  </div>
                )}
                <FormField label="Manual setup key">
                  <Input readOnly className="bg-muted/20 font-mono text-xs" value={mfaSecret} />
                </FormField>
                <OtpCodeInput value={mfaCode} onChange={setMfaCode} />
              </div>
            ) : mfaRequired ? (
              <div className="space-y-4">
                <OtpMethodSelector value={otpMethod} onChange={setOtpMethod} />
                {otpMethod === "totp" ? (
                  <OtpCodeInput value={mfaCode} onChange={setMfaCode} />
                ) : (
                  <FormField label="Recovery code">
                    <Input
                      autoComplete="one-time-code"
                      value={mfaCode}
                      onChange={(event) => setMfaCode(event.target.value.trim())}
                    />
                  </FormField>
                )}
              </div>
            ) : (
              <>
                <FormField label={t("auth.login.field.username")}>
                  <Input
                    autoComplete="username"
                    autoFocus
                    onChange={(e) => setUsername(e.target.value)}
                    type="text"
                    value={username}
                    className="h-10"
                  />
                </FormField>
                <FormField label={t("auth.login.field.password")}>
                  <div className="relative">
                    <Input
                      autoComplete="current-password"
                      className="h-10 pr-10"
                      onChange={(e) => setPassword(e.target.value)}
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                      onClick={() => setShowPassword((value) => !value)}
                      type="button"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormField>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border bg-background p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
                  <Checkbox
                    checked={rememberLogin}
                    className="mt-0.5"
                    onCheckedChange={(checked) => setRememberLogin(checked === true)}
                  />
                  <span className="grid gap-0.5 leading-none">
                    <span className="font-medium text-foreground">Keep me signed in</span>
                    <span className="text-xs leading-relaxed">Remember this browser for 30 days.</span>
                  </span>
                </label>
              </>
            )}
            <Button
              className="h-10 w-full font-semibold"
              disabled={isPending || mfaSubmitDisabled}
              type="submit"
            >
              {isPending ? (
                <>
                  <Spinner className="mr-2 size-4 animate-spin" /> {t("common.action.signing_in")}
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
        )}
      </div>
    </AuthFrame>
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
      const target = `/login?error=${encodeURIComponent(errorDescription || error)}`
      window.history.pushState(null, "", target)
      window.dispatchEvent(new PopStateEvent("popstate"))
      return
    }
    if (consentChallenge && handledConsent.current !== consentChallenge) {
      handledConsent.current = consentChallenge
      acceptHydraConsent(consentChallenge)
        .then((redirectUrl) => {
          window.location.href = redirectUrl
        })
        .catch(() => {
          window.history.pushState(null, "", "/login?error=consent_failed")
          window.dispatchEvent(new PopStateEvent("popstate"))
        })
      return
    }
    if (code && state && handledCode.current !== code) {
      handledCode.current = code
      const verifier = sessionStorage.getItem("hydra_code_verifier")
      const storedState = sessionStorage.getItem("hydra_state")
      if (state !== storedState || !verifier) {
        window.history.pushState(null, "", "/login?error=invalid_state")
        window.dispatchEvent(new PopStateEvent("popstate"))
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
          window.history.pushState(null, "", "/")
          window.dispatchEvent(new PopStateEvent("popstate"))
        })
        .catch(() => {
          window.history.pushState(null, "", "/login?error=exchange_failed")
          window.dispatchEvent(new PopStateEvent("popstate"))
        })
      return
    }
    if (!consentChallenge && !code) {
      window.history.pushState(null, "", "/login")
      window.dispatchEvent(new PopStateEvent("popstate"))
    }
  }, [code, consentChallenge, error, errorDescription, login, state])

  return (
    <AuthLoadingScreen />
  )
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
      <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
        <div className="max-w-md rounded-lg border bg-background p-6 text-sm">
          <p className="font-medium text-balance">Consent flow failed</p>
          <p className="mt-2 text-muted-foreground text-pretty">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <AuthLoadingScreen />
  )
}

function AuthFrame({
  actions,
  branding,
  children,
}: {
  actions?: ReactNode
  branding: BrandingSettings
  children: ReactNode
}) {
  const logoUrl = branding.loginLogoUrl || branding.dashboardLogoUrl
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-6 text-foreground sm:px-6">
      <div className="w-full max-w-5xl">
        <div className="grid w-full overflow-hidden rounded-xl border bg-card shadow-dialog lg:grid-cols-12">
          <AuthBrandPanel branding={branding} />
          <div className="flex flex-col justify-between bg-card p-5 sm:p-8 lg:col-span-7">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <BrandMark name={branding.appName} logoUrl={logoUrl} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold leading-none text-foreground">
                    {branding.appName}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {branding.organizationName || "Secure workspace"}
                  </p>
                </div>
              </div>
              {actions}
            </div>
            <div className="mx-auto my-auto w-full max-w-sm py-4">{children}</div>
          </div>
        </div>
      </div>
    </main>
  )
}

function AuthBrandPanel({ branding }: { branding: BrandingSettings }) {
  const hasBackground = branding.loginBackgroundEnabled && branding.loginBackgroundUrl
  return (
    <div
      className="relative hidden overflow-hidden border-r bg-muted/40 p-8 lg:col-span-5 lg:flex lg:flex-col lg:justify-between"
      style={
        hasBackground
          ? {
              backgroundImage: `linear-gradient(to top, rgb(0 0 0 / 0.7), rgb(0 0 0 / 0.2)), url(${branding.loginBackgroundUrl})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
              color: "white",
            }
          : undefined
      }
    >
      <div className="space-y-5">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
            hasBackground
              ? "border-white/30 bg-black/20 text-white"
              : "bg-background text-foreground"
          )}
        >
          <ShieldCheck
            className={cn("size-4", hasBackground ? "text-white" : "text-primary")}
          />
          <span>Identity Access Management</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold leading-tight text-balance">
            {branding.loginWelcomeTitle}
          </h1>
          <p className="text-sm leading-6 opacity-80 text-pretty">
            {branding.loginWelcomeSubtitle}
          </p>
        </div>
      </div>

      <div className="space-y-4 text-sm">
        <div
          className={cn("h-px w-full", hasBackground ? "bg-white/40" : "bg-border")}
        />
        <p
          className={cn(
            "text-xs font-medium uppercase",
            hasBackground ? "text-white/70" : "text-muted-foreground"
          )}
        >
          Security ecosystem
        </p>
        <div className="grid gap-3">
          {[
            "OAuth2/OIDC authorization flow",
            "Kratos identity and session management",
            "Multi-factor authentication ready",
          ].map((label) => (
            <div className="flex items-center gap-3" key={label}>
              <CheckCircle2
                className={cn(
                  "size-4 shrink-0",
                  hasBackground ? "text-white" : "text-success"
                )}
              />
              <span className="opacity-85">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function OtpMethodSelector({
  value,
  onChange,
}: {
  value: "totp" | "recovery"
  onChange: (value: "totp" | "recovery") => void
}) {
  const options: Array<{ value: "totp" | "recovery"; label: string }> = [
    { value: "totp", label: "Authenticator app" },
    { value: "recovery", label: "Recovery code" },
  ]
  return (
    <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-sm px-3 py-2 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-background text-foreground shadow-card"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function OtpCodeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <FormField label="Verification code">
      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={value}
          onChange={(next) => onChange(next.replace(/\D/g, "").slice(0, 6))}
        >
          <InputOTPGroup>
            {Array.from({ length: 6 }).map((_, index) => (
              <InputOTPSlot key={index} index={index} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
    </FormField>
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
  rememberLogin = true,
  mfaCode = ""
): Promise<AcceptKratosLoginResult> {
  const res = await fetch("/api/auth/kratos/accept-login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login_challenge: loginChallenge,
      remember: rememberLogin,
      remember_for: rememberLogin ? LOGIN_REMEMBER_FOR_SECONDS : 0,
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
