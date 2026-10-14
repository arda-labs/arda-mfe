import { useMemo, useState } from "react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DateField } from "@workspace/ui/components/date-field"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"
import { blockingFields, computeOverwrites, effectiveOverwrites, fieldSeverity, flagSeverity, initialValues } from "./review"
import { CCCD_FIELDS, FIELD_KIND, type CccdExtractResult, type CccdFieldName, type Severity } from "./types"

const SEVERITY_CLASS: Record<Severity, string> = {
  error: "border-destructive text-destructive",
  warning: "border-warning text-warning-ink",
  info: "text-muted-foreground",
}

export interface ReviewOutput {
  values: Record<CccdFieldName, string>
  overwrite: ReadonlySet<CccdFieldName>
}

export function ReviewStep({
  result,
  frontUrl,
  backUrl,
  existing,
  t,
  onBack,
  onApply,
  applying,
  error,
}: {
  result: CccdExtractResult
  frontUrl: string
  backUrl?: string
  existing: Partial<Record<CccdFieldName, string>>
  t: (key: string) => string
  onBack: () => void
  onApply: (out: ReviewOutput) => void
  applying?: boolean
  error?: string
}) {
  const [values, setValues] = useState(() => initialValues(result))
  const [kept, setKept] = useState<Set<CccdFieldName>>(new Set())
  const [allowOverwrite, setAllowOverwrite] = useState<Set<CccdFieldName>>(new Set())
  const [side, setSide] = useState<"front" | "back">("front")
  const [zoom, setZoom] = useState(false)
  const blocking = blockingFields(result, values, kept)
  const overwrites = useMemo(() => computeOverwrites(values, existing), [values, existing])
  const setValue = (f: CccdFieldName, value: string) => {
    setValues((v) => ({ ...v, [f]: value }))
    // An overwrite tick belongs to the value the user saw; a new value needs a new tick.
    setAllowOverwrite((s) => {
      if (!s.has(f)) return s
      const next = new Set(s)
      next.delete(f)
      return next
    })
  }
  const toggle = (set: Set<CccdFieldName>, f: CccdFieldName) => {
    const next = new Set(set)
    if (next.has(f)) next.delete(f)
    else next.add(f)
    return next
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={side === "front" ? "default" : "outline"} onClick={() => setSide("front")}>
            {t("document_scan.front")}
          </Button>
          {backUrl ? (
            <Button type="button" size="sm" variant={side === "back" ? "default" : "outline"} onClick={() => setSide("back")}>
              {t("document_scan.back")}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="ghost" onClick={() => setZoom((z) => !z)}>
            {t("document_scan.zoom")}
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-auto rounded-md border bg-muted">
          <img
            src={side === "back" && backUrl ? backUrl : frontUrl}
            alt={t(side === "back" ? "document_scan.back" : "document_scan.front")}
            className={cn("origin-top-left", zoom ? "w-[200%] max-w-none" : "w-full")}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          {t(`document_scan.card_version.${result.card_version}`)} · {t("document_scan.review_hint")}
        </div>
        {result.warnings.map((w) => (
          <div key={w} className="text-xs text-warning-ink">
            {t(`document_scan.warnings.${w}`)}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {CCCD_FIELDS.map((f) => {
          const field = result.fields[f]
          const severity = fieldSeverity(field.flags)
          const kind = FIELD_KIND[f]
          return (
            <div key={f} className={cn("space-y-1 rounded-md p-2", f === "full_name" && "bg-muted")}>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{t(`document_scan.fields.${f}`)}</span>
                {field.flags.map((flag) => (
                  <Badge key={flag} variant="outline" className={SEVERITY_CLASS[flagSeverity(flag)]}>
                    {t(`document_scan.flags.${flag}`)}
                  </Badge>
                ))}
              </div>
              {kind === "date" ? (
                <DateField value={values[f]} onChange={(e) => setValue(f, e.target.value)} />
              ) : kind === "sex" ? (
                <div className="flex gap-2">
                  {(["M", "F"] as const).map((s) => (
                    <Button key={s} type="button" size="sm" variant={values[f] === s ? "default" : "outline"} onClick={() => setValue(f, s)}>
                      {t(`document_scan.sex.${s}`)}
                    </Button>
                  ))}
                </div>
              ) : (
                <Input value={values[f]} onChange={(e) => setValue(f, e.target.value)} />
              )}
              {field.value == null && field.raw ? (
                <p className="text-xs text-muted-foreground">{field.raw}</p>
              ) : null}
              {severity === "error" && values[f] === (field.value ?? "") ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => setKept((k) => toggle(k, f))}>
                  {kept.has(f) ? t("document_scan.kept") : t("document_scan.keep")}
                </Button>
              ) : null}
              {overwrites.includes(f) ? (
                <label className="flex items-center gap-2 text-xs text-warning-ink">
                  <Checkbox checked={allowOverwrite.has(f)} onCheckedChange={() => setAllowOverwrite((s) => toggle(s, f))} />
                  {t("document_scan.will_overwrite")}
                </label>
              ) : null}
            </div>
          )
        })}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onBack}>
            {t("document_scan.retake")}
          </Button>
          <Button
            type="button"
            data-testid="document-scan-apply"
            disabled={blocking.length > 0 || applying}
            onClick={() => onApply({ values, overwrite: effectiveOverwrites(allowOverwrite, overwrites) })}
          >
            {t("document_scan.apply")}
          </Button>
        </div>
      </div>
    </div>
  )
}
