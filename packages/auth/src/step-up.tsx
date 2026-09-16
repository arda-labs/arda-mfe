import {
  useEffect,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
} from "react"
import { api, type ApiSuccess } from "@workspace/api"
import { useI18n } from "@workspace/i18n"
import { Check, ShieldCheck } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"
import { cn } from "@workspace/ui/lib/utils"
import { setStepUpHandler, type StepUpRequest } from "./step-up-channel"

export { requestStepUp } from "./step-up-channel"
export { ensureRecentAuth } from "./ensure-recent-auth"

type MFAStatus = {
  is_enrolled?: boolean
}

const OTP_LENGTH = 6
const SUCCESS_HOLD_MS = 750
const SHAKE_MS = 500

async function loadMFAStatus(): Promise<boolean> {
  try {
    const response = await api.get<ApiSuccess<MFAStatus>>(
      "/api/iam/me/mfa/status"
    )
    return Boolean(response.result.is_enrolled)
  } catch {
    return true
  }
}

export function StepUpProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [request, setRequest] = useState<StepUpRequest | null>(null)
  const [mfaEnrolled, setMfaEnrolled] = useState(true)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [shake, setShake] = useState(false)
  const [verified, setVerified] = useState(false)
  const otpRef = useRef<ComponentRef<typeof InputOTP>>(null)
  const submittingRef = useRef(false)
  const successTimer = useRef<number | null>(null)

  const clearSuccessTimer = () => {
    if (successTimer.current !== null) {
      window.clearTimeout(successTimer.current)
      successTimer.current = null
    }
  }

  useEffect(
    () =>
      setStepUpHandler((next) => {
        clearSuccessTimer()
        submittingRef.current = false
        setCode("")
        setError("")
        setShake(false)
        setVerified(false)
        setSubmitting(false)
        setMfaEnrolled(true)
        setRequest(next)
        void loadMFAStatus().then(setMfaEnrolled)
      }),
    []
  )

  useEffect(() => clearSuccessTimer, [])

  const close = (verifiedResult: boolean) => {
    clearSuccessTimer()
    submittingRef.current = false
    request?.resolve(verifiedResult)
    setRequest(null)
    setCode("")
    setError("")
    setShake(false)
    setVerified(false)
  }

  const verify = async (value: string) => {
    if (submittingRef.current || verified) return
    if (mfaEnrolled && value.length < OTP_LENGTH) {
      setError(t("auth.step_up.error_empty"))
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setError("")
    try {
      // skipAuthFailureRedirect: a wrong OTP is a step-up failure, not a
      // global session loss — never log the user out from inside the dialog.
      await api.post(
        "/api/auth/step-up",
        mfaEnrolled ? { code: value } : { confirm: true },
        { skipAuthFailureRedirect: true }
      )
      setVerified(true)
      successTimer.current = window.setTimeout(
        () => close(true),
        SUCCESS_HOLD_MS
      )
    } catch {
      setError(
        mfaEnrolled
          ? t("auth.step_up.error_invalid")
          : t("auth.step_up.error_failed")
      )
      if (mfaEnrolled) {
        // Clear the wrong code and replay the shake/focus affordance so the
        // user can retype immediately without hunting for the field.
        setCode("")
        setShake(true)
        window.setTimeout(() => setShake(false), SHAKE_MS)
        window.setTimeout(() => otpRef.current?.focus(), 0)
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleCodeChange = (next: string) => {
    const digits = next.replace(/\D/g, "").slice(0, OTP_LENGTH)
    setCode(digits)
    if (error) setError("")
    if (digits.length === OTP_LENGTH) void verify(digits)
  }

  const fieldClass = cn(
    "size-11 rounded-xl border text-lg font-bold shadow-sm transition-all duration-200 first:rounded-xl last:rounded-xl",
    verified
      ? "border-emerald-500/60 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
      : error
        ? "border-destructive/60 bg-destructive/5 text-destructive"
        : code.length > 0
          ? "border-primary/45 bg-primary/5"
          : "border-muted-foreground/20"
  )

  return (
    <>
      {children}
      <Dialog
        open={request !== null}
        onOpenChange={(open) => !open && close(false)}
      >
        <DialogContent className="z-[300] max-w-sm">
          <DialogHeader className="items-center space-y-2 text-center sm:items-center sm:text-center">
            <div
              className={cn(
                "mb-1 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition-colors duration-300",
                error &&
                  "bg-destructive/10 text-destructive ring-destructive/20",
                shake && "animate-otp-shake",
                verified &&
                  "bg-emerald-500/10 text-emerald-600 ring-emerald-500/25 dark:text-emerald-400"
              )}
            >
              <ShieldCheck className="size-7" aria-hidden />
            </div>
            <DialogTitle>{t("auth.step_up.title")}</DialogTitle>
            <DialogDescription>
              {mfaEnrolled
                ? t("auth.step_up.desc_mfa")
                : t("auth.step_up.desc_confirm")}
            </DialogDescription>
          </DialogHeader>

          {mfaEnrolled ? (
            <div className="flex flex-col items-center gap-3 py-1">
              <InputOTP
                ref={otpRef}
                autoFocus
                maxLength={OTP_LENGTH}
                value={code}
                onChange={handleCodeChange}
                inputMode="numeric"
                autoComplete="one-time-code"
                disabled={submitting || verified}
                containerClassName="justify-center"
                aria-label={t("auth.step_up.placeholder_code")}
                aria-invalid={error ? true : undefined}
              >
                <InputOTPGroup className={cn("gap-2", shake && "animate-otp-shake")}>
                  {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                    <InputOTPSlot
                      key={index}
                      index={index}
                      className={fieldClass}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <div
                className="flex min-h-5 items-center justify-center"
                aria-live="polite"
              >
                {verified ? (
                  <p className="animate-fade-up flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="size-4" aria-hidden />
                    {t("auth.step_up.verified")}
                  </p>
                ) : error ? (
                  <p
                    role="alert"
                    className="animate-fade-up text-sm text-destructive"
                  >
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex min-h-5 items-center justify-center">
              {error ? (
                <p
                  role="alert"
                  className="animate-fade-up text-sm text-destructive"
                >
                  {error}
                </p>
              ) : null}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-center">
            <Button
              variant="outline"
              className="sm:min-w-28"
              onClick={() => close(false)}
              disabled={submitting || verified}
            >
              {t("common.action.cancel")}
            </Button>
            <Button
              className="sm:min-w-28"
              onClick={() => void verify(mfaEnrolled ? code : "")}
              disabled={
                submitting || verified || (mfaEnrolled && code.length < OTP_LENGTH)
              }
            >
              {submitting
                ? t("auth.step_up.verifying")
                : t("auth.step_up.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
