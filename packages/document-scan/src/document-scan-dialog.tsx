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

export function DocumentScanDialog({ open, onOpenChange, modelLocation, existing, onApply }: DocumentScanDialogProps) {
  const { t } = useI18n()
  const [front, setFront] = useState<Shot>()
  const [back, setBack] = useState<Shot>()
  const [ack, setAck] = useState(hasCloudAck)
  const [step, setStep] = useState<"capture" | "reading" | "review">("capture")
  const [result, setResult] = useState<CccdExtractResult>()
  const [error, setError] = useState<string>()
  const [applying, setApplying] = useState(false)
  const abort = useRef<AbortController | null>(null)

  // Close = abort in-flight request and drop every image (no card data kept).
  useEffect(() => {
    if (open) return
    abort.current?.abort()
    abort.current = null
    const drop = (s?: Shot) => {
      if (s) URL.revokeObjectURL(s.url)
      return undefined
    }
    setFront(drop)
    setBack(drop)
    setResult(undefined)
    setError(undefined)
    setStep("capture")
  }, [open])

  async function pick(file: File, set: typeof setFront) {
    setError(undefined)
    try {
      const blob = await toJpeg(file)
      set((old) => {
        if (old) URL.revokeObjectURL(old.url)
        return { blob, url: URL.createObjectURL(blob) }
      })
    } catch {
      setError(t("document_scan.errors.unsupported"))
    }
  }

  async function read() {
    if (!front) return
    const controller = new AbortController()
    abort.current = controller
    setError(undefined)
    setStep("reading")
    try {
      const res = await extractCccd(front.blob, back?.blob, controller.signal)
      if (controller.signal.aborted) return
      setResult(res)
      setStep("review")
    } catch (err) {
      if (controller.signal.aborted) return
      setError(t(`document_scan.errors.${classifyExtractError(err)}`))
      setStep("capture")
    } finally {
      if (abort.current === controller) abort.current = null
    }
  }

  async function apply(out: ReviewOutput) {
    if (!result || !front) return
    setApplying(true)
    try {
      await onApply({ ...out, cardVersion: result.card_version, images: { front: front.blob, back: back?.blob } })
      onOpenChange(false)
    } finally {
      setApplying(false)
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

        {step === "review" && result && front ? (
          <ReviewStep
            result={result}
            frontUrl={front.url}
            backUrl={back?.url}
            existing={existing}
            t={t}
            applying={applying}
            onBack={() => setStep("capture")}
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
                disabled={step === "reading"}
                onPick={(f) => pick(f, setFront)}
              />
              <ImagePicker
                label={t("document_scan.back")}
                url={back?.url}
                pickLabel={t("document_scan.choose_image")}
                changeLabel={t("document_scan.change_image")}
                disabled={step === "reading"}
                onPick={(f) => pick(f, setBack)}
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
                <Button type="button" disabled={!front || needsAck} onClick={read}>
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
