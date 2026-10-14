import { useEffect, useRef, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Spinner } from "@workspace/ui/components/spinner"
import { classifyExtractError, extractCccd } from "./api"
import { hasCloudAck, setCloudAck } from "./cloud-ack"
import { ImagePicker } from "./image-picker"
import { toJpeg } from "./image"
import { ReviewStep, type ReviewOutput } from "./review-step"
import type { CardVersion, CccdExtractResult, CccdFieldName, ModelLocation } from "./types"

export interface CccdScanApply {
  values: Record<CccdFieldName, string>
  overwrite: ReadonlySet<CccdFieldName>
  cardVersion: CardVersion
  images: { front: Blob; back?: Blob }
}

export interface DocumentScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  modelLocation: ModelLocation
  existing: Partial<Record<CccdFieldName, string>>
  onApply: (input: CccdScanApply) => void | Promise<void>
}

type Shot = { blob: Blob; url: string }
type Side = "front" | "back"

export function DocumentScanDialog({ open, onOpenChange, modelLocation, existing, onApply }: DocumentScanDialogProps) {
  const { t } = useI18n()
  const [front, setFront] = useState<Shot>()
  const [back, setBack] = useState<Shot>()
  // The images the current read was started with; review and onApply use these, not whatever is picked later.
  const [frozen, setFrozen] = useState<{ front: Shot; back?: Shot }>()
  const [ack, setAck] = useState(hasCloudAck)
  const [step, setStep] = useState<"capture" | "reading" | "review">("capture")
  const [result, setResult] = useState<CccdExtractResult>()
  const [error, setError] = useState<string>()
  const [applying, setApplying] = useState(false)
  const [pendingPicks, setPendingPicks] = useState(0)
  const abort = useRef<AbortController | null>(null)
  // Bumped on close/unmount: async work started in an earlier epoch must not touch state or create URLs.
  const epoch = useRef(0)
  const shots = useRef<Record<Side, Shot | undefined>>({ front: undefined, back: undefined })

  function setShot(side: Side, shot: Shot | undefined) {
    const old = shots.current[side]
    if (old) URL.revokeObjectURL(old.url)
    shots.current[side] = shot
    ;(side === "front" ? setFront : setBack)(shot)
  }

  function release() {
    epoch.current += 1
    abort.current?.abort()
    abort.current = null
    for (const side of ["front", "back"] as const) {
      const old = shots.current[side]
      if (old) URL.revokeObjectURL(old.url)
      shots.current[side] = undefined
    }
  }

  // Close = abort in-flight request and drop every image (no card data kept).
  useEffect(() => {
    if (open) return
    release()
    setFront(undefined)
    setBack(undefined)
    setFrozen(undefined)
    setResult(undefined)
    setError(undefined)
    setStep("capture")
    setApplying(false)
  }, [open])

  // Unmount behaves like close.
  useEffect(() => release, [])

  async function pick(file: File, side: Side) {
    setError(undefined)
    const started = epoch.current
    setPendingPicks((n) => n + 1)
    try {
      const blob = await toJpeg(file)
      if (epoch.current !== started) return // dialog closed meanwhile: discard, create no URL
      setShot(side, { blob, url: URL.createObjectURL(blob) })
    } catch {
      if (epoch.current === started) setError(t("document_scan.errors.unsupported"))
    } finally {
      setPendingPicks((n) => n - 1)
    }
  }

  async function read() {
    if (!front) return
    const started = epoch.current
    const snapshot = { front, back }
    const controller = new AbortController()
    abort.current = controller
    setError(undefined)
    setStep("reading")
    try {
      const res = await extractCccd(snapshot.front.blob, snapshot.back?.blob, controller.signal)
      if (controller.signal.aborted || epoch.current !== started) return
      setFrozen(snapshot)
      setResult(res)
      setStep("review")
    } catch (err) {
      if (controller.signal.aborted || epoch.current !== started) return
      setError(t(`document_scan.errors.${classifyExtractError(err)}`))
      setStep("capture")
    } finally {
      if (abort.current === controller) abort.current = null
    }
  }

  async function apply(out: ReviewOutput) {
    if (!result || !frozen) return
    const started = epoch.current
    setApplying(true)
    setError(undefined)
    try {
      await onApply({ ...out, cardVersion: result.card_version, images: { front: frozen.front.blob, back: frozen.back?.blob } })
      onOpenChange(false)
    } catch {
      if (epoch.current === started) setError(t("document_scan.errors.unknown"))
    } finally {
      if (epoch.current === started) setApplying(false)
    }
  }

  const needsAck = modelLocation === "cloud" && !ack

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("document_scan.title")}</DialogTitle>
          <DialogDescription>{t("document_scan.description")}</DialogDescription>
        </DialogHeader>

        {step === "review" && result && frozen ? (
          <ReviewStep
            result={result}
            frontUrl={frozen.front.url}
            backUrl={frozen.back?.url}
            existing={existing}
            t={t}
            applying={applying}
            error={error}
            onBack={() => {
              setResult(undefined)
              setFrozen(undefined)
              setError(undefined)
              setStep("capture")
            }}
            onApply={apply}
          />
        ) : (
          <div className="space-y-4">
            {modelLocation === "cloud" ? (
              <Alert className="border-warning">
                <AlertTitle>{t("document_scan.cloud_warning_title")}</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>{t("document_scan.cloud_warning_body")}</p>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={ack}
                      onCheckedChange={(v) => {
                        if (v === true) {
                          setCloudAck()
                          setAck(true)
                        }
                      }}
                    />
                    {t("document_scan.cloud_ack")}
                  </label>
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <ImagePicker
                label={t("document_scan.front")}
                url={front?.url}
                pickLabel={t("document_scan.choose_image")}
                changeLabel={t("document_scan.change_image")}
                disabled={step === "reading" || pendingPicks > 0}
                onPick={(f) => pick(f, "front")}
              />
              <ImagePicker
                label={t("document_scan.back")}
                url={back?.url}
                pickLabel={t("document_scan.choose_image")}
                changeLabel={t("document_scan.change_image")}
                disabled={step === "reading" || pendingPicks > 0}
                onPick={(f) => pick(f, "back")}
              />
            </div>
            {front && !back ? <p className="text-xs text-muted-foreground">{t("document_scan.back_missing_hint")}</p> : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              {step === "reading" ? (
                <>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner />
                    {t("document_scan.reading")}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      abort.current?.abort()
                      abort.current = null
                      setStep("capture")
                    }}
                  >
                    {t("document_scan.cancel")}
                  </Button>
                </>
              ) : (
                <Button type="button" disabled={!front || needsAck || pendingPicks > 0} onClick={read}>
                  {t("document_scan.read")}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
