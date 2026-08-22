import { useEffect, useState, type ReactNode } from "react"
import { apiUrl } from "@workspace/core/http/api-url"
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
    const res = await fetch(apiUrl("/api/iam/me/mfa/status"), {
      credentials: "include",
    })
    if (!res.ok) return true
    const data = (await res.json()) as MFAStatus
    return Boolean(data.is_enrolled)
  } catch {
    return true
  }
}

export function StepUpProvider({ children }: { children: ReactNode }) {
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
        setError("Nhập mã xác thực để tiếp tục.")
        return
      }
    }

    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(apiUrl("/api/auth/step-up"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mfaEnrolled ? { code: code.trim() } : { confirm: true }
        ),
      })
      if (!res.ok) throw new Error("verify failed")
      close(true)
    } catch {
      setError(
        mfaEnrolled
          ? "Mã xác thực không hợp lệ hoặc đã hết hạn."
          : "Không xác nhận được. Vui lòng thử lại."
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
              Xác minh để tiếp tục
            </DialogTitle>
            <DialogDescription>
              {mfaEnrolled
                ? "Thao tác nhạy cảm cần xác thực thêm. Phiên xác minh có hiệu lực trong thời gian ngắn."
                : "Thao tác nhạy cảm cần xác nhận thêm. Nhấn Tiếp tục để làm mới phiên đăng nhập."}
            </DialogDescription>
          </DialogHeader>
          {mfaEnrolled ? (
            <div className="space-y-2">
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                placeholder="Mã MFA 6 số"
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
              Hủy
            </Button>
            <Button
              onClick={verify}
              disabled={submitting || (mfaEnrolled && !code.trim())}
            >
              {submitting ? "Đang xác minh..." : "Tiếp tục"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
