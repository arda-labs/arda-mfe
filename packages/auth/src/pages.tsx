import {
  useSystemBranding,
  type BrandingSettings,
} from "@workspace/theme/branding"
import { api, type ApiSuccess } from "@workspace/api"
import { apiUrl } from "@workspace/api/url"
import { getMediaContentUrl } from "@workspace/media/urls"
import { translateApiError, useI18n } from "@workspace/i18n"
import { BrandMark } from "@workspace/ui/components/brand-mark"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { QRCode, QRCodeSvg } from "@workspace/ui/components/qr-code"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"
import {
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
  Languages,
  Lock,
  LogIn,
  Moon,
  ShieldCheck,
  Sun,
  User,
} from "lucide-react"
import { toast } from "@workspace/ui/feedback/toast"
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"
import { useTheme } from "@workspace/theme"
import { AuthLoadingScreen } from "./loading-screen"
import {
  acceptHydraConsent,
  clearLoginChallengeRemint,
  exchangeCode,
  canRemintLoginChallenge,
  isExpiredLoginChallengeError,
  markLoginChallengeRemint,
  redirectToHydraLogin,
  validateLoginChallenge,
} from "./oauth"
import { normalizeAuthUser, useAuthStore, type AuthUserSource } from "./store"

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
  const [challengeState, setChallengeState] = useState<
    "checking" | "valid" | "stale"
  >(() => (loginChallenge ? "checking" : "stale"))
  const isDarkMode =
    typeof document !== "undefined"
      ? document.documentElement.classList.contains("dark")
      : theme === "dark"

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
    if (!loginChallenge && !isAuthenticated && !searchError)
      redirectToHydraLogin()
  }, [loginChallenge, isAuthenticated, searchError])

  useEffect(() => {
    if (!loginChallenge || challengeState !== "checking") return
    let cancelled = false
    validateLoginChallenge(loginChallenge).then((valid) => {
      if (cancelled) return
      if (valid === false && canRemintLoginChallenge()) {
        markLoginChallengeRemint()
        redirectToHydraLogin()
        return
      }
      // A confirmed-dead challenge with the remint guard exhausted goes to the
      // retry screen; a transient validation failure fails open to the form,
      // where submit-time recovery still covers staleness.
      setChallengeState(valid === false ? "stale" : "valid")
    })
    return () => {
      cancelled = true
    }
  }, [loginChallenge, challengeState])

  if (!loginChallenge && !searchError) {
    return <AuthLoadingScreen />
  }

  if (challengeState === "checking") {
    return <AuthLoadingScreen />
  }

  const handleLogin = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (isPending) return
    setError(null)
    setIsPending(true)
    try {
      if (mfaRequired || mfaEnrollmentRequired) {
        const result = await acceptKratosLogin(
          loginChallenge,
          kratosSessionToken,
          rememberLogin,
          mfaCode
        )
        if (result.backup_codes?.length && result.redirect_url) {
          setBackupCodes(result.backup_codes)
          setPendingRedirectURL(result.redirect_url)
        }
        return
      }
      const flow = await createKratosLoginFlow()
      if (flow.sessionAlreadyAvailable) {
        const result = await acceptKratosLogin(
          loginChallenge,
          "",
          rememberLogin
        )
        handleMFAResult(result, "")
        return
      }
      const csrfToken = getKratosCsrfToken(flow)
      const submitUrl = apiUrl(
        `/api/kratos/login?flow=${encodeURIComponent(flow.id)}`
      )
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
        throw new Error(readProblemCode(err, "auth.login.error.failed"))
      }
      const loginResult = await readJsonResponse(res, "auth.login.error.failed")
      const flowError = getKratosFlowError(loginResult)
      if (flowError) throw new Error(flowError)
      const sessionToken = loginResult.session_token || ""
      if (!sessionToken) throw new Error("auth.login.error.failed")
      const result = await acceptKratosLogin(
        loginChallenge,
        sessionToken,
        rememberLogin
      )
      handleMFAResult(result, sessionToken)
    } catch (err) {
      // The Hydra challenge is one-shot: consumed by a completed login
      // (e.g. Back button) or expired while the form was open. Re-minting a
      // fresh flow is seamless when the Kratos session already exists.
      if (isExpiredLoginChallengeError(err) && canRemintLoginChallenge()) {
        markLoginChallengeRemint()
        redirectToHydraLogin()
        return
      }
      setError(translateApiError(err, "auth.login.error.failed"))
    } finally {
      setIsPending(false)
    }
  }

  const handleMFAResult = (
    result: AcceptKratosLoginResult,
    sessionToken: string
  ) => {
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
              Store these somewhere safe. Each code can be used once if you lose
              your authenticator.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((backupCode) => (
              <div
                key={backupCode}
                className="rounded-md border bg-muted/30 p-2 text-center"
              >
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
            <Button
              type="button"
              onClick={() => (window.location.href = pendingRedirectURL || "/")}
            >
              Continue
            </Button>
          </div>
        </div>
      </AuthFrame>
    )
  }

  const showRetryButton =
    challengeState === "stale" || (!loginChallenge && Boolean(searchError))
  const mfaSubmitDisabled = mfaEnrollmentRequired
    ? mfaCode.length !== 6
    : mfaRequired
      ? otpMethod === "totp"
        ? mfaCode.length !== 6
        : !mfaCode.trim()
      : !username || !password

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <Button
          aria-label={t("common.action.toggle_theme")}
          onClick={() =>
            setTheme(
              document.documentElement.classList.contains("dark")
                ? "light"
                : "dark"
            )
          }
          size="icon-sm"
          type="button"
          variant="outline"
          className="size-8 rounded-full bg-background shadow-sm"
        >
          {isDarkMode ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Select language"
              size="sm"
              type="button"
              variant="outline"
              className="h-8 gap-1.5 rounded-full bg-background px-3 shadow-sm"
            >
              <Languages className="size-4" />
              {locale === "vi-VN" ? "🇻🇳" : "🇺🇸"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-32">
            <DropdownMenuItem onClick={() => setLocale("vi-VN")}>
              <span className="mr-2">🇻🇳</span> Tiếng Việt
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocale("en-US")}>
              <span className="mr-2">🇺🇸</span> English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AuthFrame branding={branding}>
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-balance text-foreground">
              {mfaRequired || mfaEnrollmentRequired
                ? "Xác thực bảo mật"
                : t("auth.login.title")}
            </h1>
            <p className="text-sm text-pretty text-muted-foreground">
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
              <span className="leading-normal font-medium">{error}</span>
            </div>
          )}

          {showRetryButton ? (
            <div className="space-y-4 py-2">
              <div className="text-sm leading-relaxed text-muted-foreground">
                We were unable to secure a connection with the authorization
                server. This may be due to an expired session or network
                configuration issues.
              </div>
              <Button
                onClick={() => {
                  clearLoginChallengeRemint()
                  redirectToHydraLogin()
                }}
                className="h-10 w-full font-semibold"
              >
                Retry Secure Sign In
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleLogin}>
              {mfaEnrollmentRequired ? (
                <div className="space-y-4">
                  <div className="rounded-md border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                    Administrator privileges require Multi-Factor
                    Authentication. Scan the QR code with your authenticator
                    app, then enter the 6-digit code.
                  </div>
                  {mfaOTPAuthURL && (
                    <div className="flex justify-center">
                      <div className="rounded-lg border bg-white p-4 shadow-card">
                        <QRCode
                          value={mfaOTPAuthURL}
                          size={176}
                          level="M"
                          margin={0}
                        >
                          <QRCodeSvg />
                        </QRCode>
                      </div>
                    </div>
                  )}
                  <FormField label="Manual setup key">
                    <Input
                      readOnly
                      className="bg-muted/20 font-mono text-xs"
                      value={mfaSecret}
                    />
                  </FormField>
                  <OtpCodeInput value={mfaCode} onChange={setMfaCode} />
                </div>
              ) : mfaRequired ? (
                <div className="space-y-4">
                  <OtpMethodSelector
                    value={otpMethod}
                    onChange={setOtpMethod}
                  />
                  {otpMethod === "totp" ? (
                    <OtpCodeInput value={mfaCode} onChange={setMfaCode} />
                  ) : (
                    <FormField label="Recovery code">
                      <Input
                        autoComplete="one-time-code"
                        value={mfaCode}
                        onChange={(event) =>
                          setMfaCode(event.target.value.trim())
                        }
                      />
                    </FormField>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="relative">
                      <User className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoComplete="username"
                        autoFocus
                        placeholder="Tên đăng nhập"
                        onChange={(e) => setUsername(e.target.value)}
                        type="text"
                        value={username}
                        className="h-10 pl-9"
                      />
                    </div>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoComplete="current-password"
                        className="h-10 pr-10 pl-9"
                        placeholder="Mật khẩu"
                        onChange={(e) => setPassword(e.target.value)}
                        type={showPassword ? "text" : "password"}
                        value={password}
                      />
                      <button
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() => setShowPassword((value) => !value)}
                        type="button"
                      >
                        {showPassword ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <label className="flex cursor-pointer items-center gap-3 py-1 text-sm">
                    <Checkbox
                      checked={rememberLogin}
                      onCheckedChange={(checked) =>
                        setRememberLogin(checked === true)
                      }
                    />
                    <span className="text-muted-foreground">
                      Ghi nhớ đăng nhập
                    </span>
                  </label>
                  <div className="text-right">
                    <button
                      className="cursor-pointer text-sm text-primary hover:underline"
                      onClick={() => {
                        window.location.href = "/recovery"
                      }}
                      type="button"
                    >
                      {t("auth.recovery.link")}
                    </button>
                  </div>
                </>
              )}
              <Button
                className="h-10 w-full font-semibold"
                disabled={isPending || mfaSubmitDisabled}
                type="submit"
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-2 size-4 animate-spin" />{" "}
                    {t("common.action.signing_in")}
                  </>
                ) : mfaRequired || mfaEnrollmentRequired ? (
                  <>
                    <ShieldCheck className="mr-2 size-4" /> Verify
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 size-4" />{" "}
                    {t("common.action.sign_in")}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </AuthFrame>
    </>
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
          const me = await api.get<ApiSuccess<AuthUserSource>>("/api/auth/me")
          login(normalizeAuthUser(me.result, getMediaContentUrl))
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

  return <AuthLoadingScreen />
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
          <p className="mt-2 text-pretty text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return <AuthLoadingScreen />
}

// ── Password recovery (Kratos self-service recovery via the BFF proxy) ──

type KratosRecoveryFlow = KratosFlow & { id?: string; state?: string }

function recoveryMethod(flow: KratosFlow | null) {
  const nodes = Array.isArray(flow?.ui?.nodes) ? flow.ui.nodes : []
  const methodNode = nodes.find(
    (node) => (node?.attributes as { name?: unknown } | undefined)?.name === "method"
  )
  const options = (methodNode?.attributes as { value?: unknown } | undefined)?.value
  return typeof options === "string" && options ? options : "code"
}

function recoveryInputNodes(flow: KratosFlow | null) {
  const nodes = Array.isArray(flow?.ui?.nodes) ? flow.ui.nodes : []
  return nodes.filter((node) => {
    const attrs = node?.attributes as { name?: unknown; type?: unknown } | undefined
    const name = typeof attrs?.name === "string" ? attrs.name : ""
    const type = typeof attrs?.type === "string" ? attrs.type : ""
    return (
      name !== "" &&
      !["csrf_token", "method", "submit"].includes(name) &&
      !["hidden", "submit", "button"].includes(type)
    )
  })
}

async function submitRecoveryFlow(
  flow: KratosRecoveryFlow,
  fields: Record<string, string>
) {
  const body = new URLSearchParams({
    csrf_token: getKratosCsrfToken(flow),
    method: recoveryMethod(flow),
    ...fields,
  })
  const res = await fetch(
    apiUrl(`/api/kratos/recovery?flow=${encodeURIComponent(flow?.id ?? "")}`),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
    }
  )
  const data = await readJsonResponse(res, "auth.recovery.error.failed")
  if (data?.error?.message || data?.error?.id) {
    throw new Error(data.error.message || "auth.recovery.error.failed")
  }
  return data as KratosRecoveryFlow
}

/** Quên/đặt lại mật khẩu — drives the Kratos recovery flow through the BFF. */
export function RecoveryPage() {
  const { t } = useI18n()
  const { branding } = useSystemBranding()
  const [flow, setFlow] = useState<KratosRecoveryFlow | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const done = flow?.state === "passed_challenge"

  useEffect(() => {
    let cancelled = false
    const start = async () => {
      const params = new URLSearchParams(window.location.search)
      const flowId = params.get("flow") || ""
      const code = params.get("code") || ""
      try {
        const res = await fetch(
          apiUrl(
            flowId
              ? `/api/kratos/recovery/flows?id=${encodeURIComponent(flowId)}`
              : "/api/kratos/recovery/browser"
          ),
          { credentials: "include", headers: { Accept: "application/json" } }
        )
        let data = await readJsonResponse(res, "auth.recovery.error.failed")
        if (data?.error?.message || data?.error?.id) {
          throw new Error(data.error.message || "auth.recovery.error.failed")
        }
        if (code) {
          data = await submitRecoveryFlow(data, { code })
        }
        if (!cancelled) setFlow(data)
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : t("auth.recovery.error.failed")
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void start()
    return () => {
      cancelled = true
    }
  }, [t])

  const submit = async () => {
    if (!flow) return
    setPending(true)
    setError("")
    try {
      const next = await submitRecoveryFlow(flow, values)
      const flowError = getKratosFlowError(next)
      if (flowError) setError(flowError)
      setFlow(next)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("auth.recovery.error.failed")
      )
    } finally {
      setPending(false)
    }
  }

  if (loading) return <AuthLoadingScreen />

  return (
    <AuthFrame branding={branding}>
      <div className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">
            {t("auth.recovery.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.recovery.description")}
          </p>
        </div>

        {done ? (
          <div className="space-y-4">
            <p className="text-sm text-emerald-600">
              {t("auth.recovery.success")}
            </p>
            <Button
              className="h-10 w-full font-semibold"
              onClick={() => {
                window.location.href = "/settings/security"
              }}
            >
              {t("auth.recovery.btn.change_password")}
            </Button>
          </div>
        ) : error && !flow ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              className="h-10 w-full"
              onClick={() => {
                window.location.href = "/recovery"
              }}
            >
              {t("auth.recovery.btn.retry")}
            </Button>
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(event: FormEvent) => {
              event.preventDefault()
              void submit()
            }}
          >
            {recoveryInputNodes(flow).map((node, index) => {
              const attrs = node.attributes as {
                name?: string
                type?: string
              }
              const name = attrs.name ?? `field_${index}`
              const type = attrs.type ?? "text"
              return (
                <FormField key={name} label={name}>
                  <Input
                    autoFocus
                    className="h-10"
                    type={type === "email" ? "email" : type}
                    value={values[name] ?? ""}
                    onChange={(event) =>
                      setValues((prev) => ({ ...prev, [name]: event.target.value }))
                    }
                  />
                </FormField>
              )
            })}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              className="h-10 w-full font-semibold"
              disabled={pending}
              type="submit"
            >
              {pending ? (
                <>
                  <Spinner className="mr-2 size-4 animate-spin" />
                  {t("auth.recovery.btn.submitting")}
                </>
              ) : (
                t("auth.recovery.btn.submit")
              )}
            </Button>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  window.location.href = "/login"
                }}
              >
                {t("auth.recovery.btn.back_to_login")}
              </button>
            </div>
          </form>
        )}
      </div>
    </AuthFrame>
  )
}

function AuthFrame({
  branding,
  children,
}: {
  branding: BrandingSettings
  children: ReactNode
}) {
  const logoUrl = branding.loginLogoUrl || branding.dashboardLogoUrl
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border bg-card px-6 py-8 shadow-sm sm:px-8 sm:py-10">
          <div className="mb-8 flex items-center gap-3">
            <BrandMark name={branding.appName} logoUrl={logoUrl} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {branding.appName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {branding.organizationName || "Secure workspace"}
              </p>
            </div>
          </div>
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()}{" "}
          {branding.organizationName || branding.appName}. All rights reserved.
        </p>
      </div>
    </main>
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
  const res = await fetch(apiUrl("/api/kratos/login/api"), {
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
  return typeof csrfNode?.attributes?.value === "string"
    ? csrfNode.attributes.value
    : ""
}

function getKratosFlowError(flow: KratosFlow) {
  const flowMessages = Array.isArray(flow?.ui?.messages) ? flow.ui.messages : []
  const nodeMessages = Array.isArray(flow?.ui?.nodes)
    ? flow.ui.nodes.flatMap((node) =>
        Array.isArray(node?.messages) ? node.messages : []
      )
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
  const res = await fetch(apiUrl("/api/auth/kratos/accept-login"), {
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
    throw new Error(readProblemCode(err, "auth.login.error.failed"))
  }
  const data = await readJsonResponse(res, "auth.login.error.failed")
  if (
    data.mfa_required ||
    data.mfa_enrollment_required ||
    data.backup_codes?.length
  )
    return data
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

// BFF errors are RFC 7807 problem documents whose `code` carries the machine
// code (e.g. login_challenge_expired); Kratos proxy errors nest under `error`.
function readProblemCode(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    if (typeof record.code === "string" && record.code) return record.code
    const nested = record.error
    if (typeof nested === "string" && nested) return nested
    if (nested && typeof nested === "object") {
      const nestedCode = (nested as Record<string, unknown>).code
      if (typeof nestedCode === "string" && nestedCode) return nestedCode
    }
    if (typeof record.message === "string" && record.message) {
      return record.message
    }
  }
  return fallback
}
