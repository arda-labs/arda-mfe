import { QRCode, QRCodeSvg } from "@workspace/ui/components/qr-code"
import { useEffect, useState } from "react"
import { mfaApi } from "@/features/settings/api/mfa"
import type { MFASecret } from "@/features/settings/api/mfa"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui/components/input-otp"
import { Label } from "@workspace/ui/components/label"
import { Spinner } from "@workspace/ui/components/spinner"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { KeyRound, ShieldAlert, CheckCircle2, QrCode, Copy } from "lucide-react"

export function SecurityPage() {
  const [status, setStatus] = useState<{
    is_enrolled: boolean
    method: string
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<"idle" | "generating" | "qr" | "done">(
    "idle"
  )
  const [secret, setSecret] = useState<MFASecret | null>(null)
  const [code, setCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [error, setError] = useState("")

  const loadStatus = async () => {
    try {
      const res = await mfaApi.status()
      setStatus(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const handleEnroll = async () => {
    setStep("generating")
    setError("")
    try {
      const s = await mfaApi.getSecret()
      setSecret(s)
      setStep("qr")
    } catch (e: any) {
      setError(e.message)
      setStep("idle")
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) return
    setError("")
    try {
      const res = await mfaApi.verifyEnroll(code)
      setBackupCodes(res.backup_codes)
      setStep("done")
      setStatus({ is_enrolled: true, method: "totp" })
    } catch (e: any) {
      setError(e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security</h1>
        <p className="text-muted-foreground">
          Manage two-factor authentication
        </p>
      </div>

      <Card className="rounded-2xl border bg-card/50 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-muted/50 pb-5">
          <CardTitle className="flex items-center justify-between gap-3 text-xl">
            <div className="flex items-center gap-2.5">
              <KeyRound className="size-5 text-primary" />
              <span>Two-Factor Authentication (TOTP)</span>
            </div>
            {status && (
              <Status variant={status.is_enrolled ? "success" : "default"} className="rounded-full px-3">
                <StatusIndicator />
                <StatusLabel className="text-xs font-semibold">{status.is_enrolled ? "Enabled" : "Disabled"}</StatusLabel>
              </Status>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex items-start gap-3.5 rounded-2xl border border-primary/10 bg-primary/5 p-5">
            <ShieldAlert className="size-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Trusted browsers protection</p>
              <p className="text-xs text-muted-foreground leading-normal">
                After you verify MFA during sign-in, you can choose to trust the current browser for 30 days. Trusted browsers may skip MFA until that trust expires or the device is removed.
              </p>
            </div>
          </div>

          {step === "idle" && !status?.is_enrolled && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enhance your account security by requiring a verification code at login.
              </p>
              <Button onClick={handleEnroll} className="rounded-xl px-6 py-5 font-semibold">Enable 2FA</Button>
            </div>
          )}

          {status?.is_enrolled && step !== "done" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="size-4" />
                <span>Two-factor authentication is active.</span>
              </div>
              <Button
                variant="destructive"
                className="rounded-xl px-5 py-4 text-xs font-semibold"
                onClick={async () => {
                  await mfaApi.reset()
                  setStatus({ is_enrolled: false, method: "" })
                  setStep("idle")
                }}
              >
                Reset 2FA
              </Button>
            </div>
          )}

          {step === "generating" && (
            <div className="flex items-center gap-2.5 py-4">
              <Spinner className="size-5 text-primary" />
              <span className="text-sm text-muted-foreground">Generating secure authentication keys...</span>
            </div>
          )}

          {step === "qr" && secret && (
            <div className="space-y-6 border-t border-muted/50 pt-5">
              <div className="flex items-start gap-2.5 text-sm text-muted-foreground leading-normal">
                <QrCode className="size-4 text-primary mt-0.5 shrink-0" />
                <p>
                  Scan this QR code with Google Authenticator, Microsoft Authenticator, 1Password, or any TOTP application.
                </p>
              </div>

              <div className="flex justify-center py-2">
                <div className="rounded-2xl border-2 border-primary/10 bg-white p-4.5 shadow-md">
                  <QRCode
                    value={secret.otpauth_url}
                    size={180}
                    level="M"
                    margin={0}
                  >
                    <QRCodeSvg />
                  </QRCode>
                </div>
              </div>

              <div className="space-y-1.5 group">
                <Label htmlFor="mfa-secret" className="text-xs font-semibold text-muted-foreground">Manual setup key</Label>
                <div className="relative flex items-center">
                  <Input
                    id="mfa-secret"
                    value={secret.secret}
                    readOnly
                    className="font-mono text-xs pr-11 bg-muted/20 border-muted-foreground/10 rounded-xl py-5"
                  />
                  <button 
                    type="button"
                    onClick={() => navigator.clipboard.writeText(secret.secret)}
                    className="absolute right-3 p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-muted/50 p-5 bg-muted/10">
                <Label className="text-sm font-semibold">Enter 6-digit verification code</Label>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    onChange={(value) => setCode(value)}
                    containerClassName="justify-center sm:justify-start"
                  >
                    <InputOTPGroup className="gap-2">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="size-11 rounded-xl border border-muted-foreground/20 text-lg font-bold shadow-sm"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <Button onClick={handleVerify} disabled={code.length !== 6} className="rounded-xl px-6 py-5 font-semibold shadow-sm">
                    Verify & Activate
                  </Button>
                </div>
              </div>
            </div>
          )}

          {step === "done" && backupCodes.length > 0 && (
            <div className="space-y-5 border-t border-muted/50 pt-5">
              <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
                <CheckCircle2 className="size-5" />
                <span>Two-factor authentication successfully enabled!</span>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3">
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  Backup Codes (Save these securely, shown only once)
                </p>
                <div className="grid grid-cols-2 gap-2 font-mono text-sm tracking-wider text-emerald-800 dark:text-emerald-200">
                  {backupCodes.map((backupCode) => (
                    <span key={backupCode} className="p-1.5 bg-background/50 border border-emerald-500/10 rounded-lg text-center font-semibold">
                      {backupCode}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                Each code can be used once to bypass MFA if you lose your authentication device. Store them in a safe place.
              </p>
              <Button onClick={() => setStep("idle")} className="rounded-xl px-6 py-5 font-semibold w-full sm:w-auto">Finish Setup</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
