import { useState, type ReactNode } from "react"
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

type StepUpRequest = {
  resolve: (verified: boolean) => void
}

let openStepUp: ((request: StepUpRequest) => void) | undefined

export function requestStepUp() {
  return new Promise<boolean>((resolve) => {
    if (!openStepUp) {
      resolve(false)
      return
    }
    openStepUp({ resolve })
  })
}

export function StepUpProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<StepUpRequest | null>(null)
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  openStepUp = (next) => {
    setCode("")
    setError("")
    setRequest(next)
  }

  const close = (verified: boolean) => {
    request?.resolve(verified)
    setRequest(null)
    setCode("")
    setError("")
  }

  const verify = async () => {
    const trimmed = code.trim()
    if (!trimmed) {
      setError("Enter a verification code to continue.")
      return
    }
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/auth/step-up", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      })
      if (!res.ok) throw new Error("verify failed")
      close(true)
    } catch {
      setError("The verification code is invalid or expired.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {children}
      <Dialog open={request !== null} onOpenChange={(open) => !open && close(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5" />
              Verify to continue
            </DialogTitle>
            <DialogDescription>
              This sensitive action needs one more check. Verification stays active for a short time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              autoFocus
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit MFA code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void verify()
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={verify} disabled={submitting || !code.trim()}>
              {submitting ? "Verifying..." : "Verify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
