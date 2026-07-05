import { useEffect, useState, type ReactNode } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ShieldCheck, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { setStepUpHandler, type StepUpRequest } from "./step-up-channel"

export { requestStepUp } from "./step-up-channel"
export { ensureRecentAuth } from "./ensure-recent-auth"

type MFAStatus = {
  is_enrolled?: boolean
}

async function loadMFAStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/iam/me/mfa/status", { credentials: "include" })
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
      const res = await fetch("/api/auth/step-up", {
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
      <Dialog open={request !== null} onOpenChange={(open) => !open && close(false)}>
        <DialogPortal>
          <DialogOverlay className="fixed inset-0 z-[300] bg-black/45 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={cn(
              "fixed top-[50%] left-[50%] z-[300] flex w-full max-w-sm translate-x-[-50%] translate-y-[-50%] flex-col gap-4 border bg-background p-5 text-foreground shadow-dialog duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:rounded-lg"
            )}
          >
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
              <Button variant="outline" onClick={() => close(false)} disabled={submitting}>
                Hủy
              </Button>
              <Button
                onClick={verify}
                disabled={submitting || (mfaEnrolled && !code.trim())}
              >
                {submitting ? "Đang xác minh..." : "Tiếp tục"}
              </Button>
            </DialogFooter>
            <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm text-foreground opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring/70 focus:ring-offset-2 focus:ring-offset-background disabled:pointer-events-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </>
  )
}
