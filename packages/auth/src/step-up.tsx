import { useEffect, useState, type ReactNode } from "react"
import { api, type ApiSuccess } from "@workspace/api"
import { useI18n } from "@workspace/i18n"
import { ShieldCheck } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { setStepUpHandler, type StepUpRequest } from "./step-up-channel"

export { requestStepUp } from "./step-up-channel"
export { ensureRecentAuth } from "./ensure-recent-auth"

type MFAStatus = {
  is_enrolled?: boolean
}

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

  useEffect(
    () =>
      setStepUpHandler((next) => {
        setCode("")
        setError("")
        setMfaEnrolled(true)
        setRequest(next)
        void loadMFAStatus().then(setMfaEnrolled)
      }),
    []
  )

  const close = (verified: boolean) => {
    request?.resolve(verified)
    setRequest(null)
    setCode("")
    setError("")
  }

  const verify = async () => {
    if (mfaEnrolled) {
      const trimmed = code.trim()
      if (!trimmed) {
        setError(t("auth.step_up.error_empty"))
        return
      }
    }

    setSubmitting(true)
    setError("")
    try {
      // skipAuthFailureRedirect: a wrong OTP is a step-up failure, not a
      // global session loss — never log the user out from inside the dialog.
      await api.post(
        "/api/auth/step-up",
        mfaEnrolled ? { code: code.trim() } : { confirm: true },
        { skipAuthFailureRedirect: true }
      )
      close(true)
    } catch {
      setError(
        mfaEnrolled
          ? t("auth.step_up.error_invalid")
          : t("auth.step_up.error_failed")
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {children}
      <Dialog
        open={request !== null}
        onOpenChange={(open) => !open && close(false)}
      >
        <DialogContent className="z-[300] max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              {t("auth.step_up.title")}
            </DialogTitle>
            <DialogDescription>
              {mfaEnrolled
                ? t("auth.step_up.desc_mfa")
                : t("auth.step_up.desc_confirm")}
            </DialogDescription>
          </DialogHeader>
          {mfaEnrolled ? (
            <div className="space-y-2">
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                placeholder={t("auth.step_up.placeholder_code")}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void verify()
                }}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          ) : (
            error && <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => close(false)}
              disabled={submitting}
            >
              {t("common.action.cancel")}
            </Button>
            <Button
              onClick={verify}
              disabled={submitting || (mfaEnrolled && !code.trim())}
            >
              {submitting ? t("auth.step_up.verifying") : t("auth.step_up.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
