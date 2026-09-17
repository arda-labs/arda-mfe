import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Calculator, Plus, Trash2 } from "lucide-react"
import {
  statisticalApi,
  type ScoreBand,
  type ScoreEntry,
  type ScoreResult,
} from "../../api"

const emptyEntry: ScoreEntry = {
  indicator_code: "",
  value: 0,
  max_value: 10,
  weight: 1,
}

const DEFAULT_BANDS: ScoreBand[] = [
  { rank_code: "C", min_score: 0 },
  { rank_code: "B", min_score: 60 },
  { rank_code: "A", min_score: 80 },
]

/**
 * Rank-score calculator (fe_statistical #19): indicator entries + weights
 * (mdm scoring catalogs) and benchmark bands. `onComputed` refreshes the
 * ranking history table after a successful persist.
 */
export function ScoreCalculator({
  onComputed,
}: {
  onComputed: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<ScoreResult | null>(null)
  const [scoringTypeCode, setScoringTypeCode] = useState("CIF_CORP")
  const [subjectType, setSubjectType] = useState("CUSTOMER")
  const [subjectRef, setSubjectRef] = useState("")
  const [entries, setEntries] = useState<ScoreEntry[]>([{ ...emptyEntry }])
  const [bands, setBands] = useState<ScoreBand[]>(DEFAULT_BANDS)

  const updateEntry = (index: number, patch: Partial<ScoreEntry>) =>
    setEntries((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )

  const updateBand = (index: number, patch: Partial<ScoreBand>) =>
    setBands((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )

  const submit = async () => {
    if (!scoringTypeCode.trim()) {
      notify.error(t("statistical.scoring.validation.type_required"))
      return
    }
    setSubmitting(true)
    try {
      const created = await statisticalApi.createScoreResult({
        scoring_type_code: scoringTypeCode.trim(),
        subject_type: subjectType,
        subject_ref: subjectRef.trim(),
        entries: entries.filter((e) => e.indicator_code.trim() !== ""),
        bands,
      })
      setLastResult(created)
      notify.success(
        t("statistical.scoring.toast.computed", {
          score: created.total_score,
          rank: created.rank_code || "—",
        })
      )
      await onComputed()
    } catch (err) {
      notify.error(
        t("statistical.scoring.toast.failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="shadow-xs">
      <CardContent className="space-y-4 pt-6 text-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="font-medium">
              {t("statistical.scoring.field.type")}
            </label>
            <Input
              className="h-8 text-xs font-mono"
              value={scoringTypeCode}
              onChange={(e) => setScoringTypeCode(e.target.value)}
              placeholder="CIF_CORP"
            />
          </div>
          <div className="space-y-1.5">
            <label className="font-medium">
              {t("statistical.scoring.field.subject_type")}
            </label>
            <Select value={subjectType} onValueChange={setSubjectType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER">
                  {t("statistical.scoring.subject_type.CUSTOMER")}
                </SelectItem>
                <SelectItem value="AGREEMENT">
                  {t("statistical.scoring.subject_type.AGREEMENT")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="font-medium">
              {t("statistical.scoring.field.subject_ref")}
            </label>
            <Input
              className="h-8 text-xs font-mono"
              value={subjectRef}
              onChange={(e) => setSubjectRef(e.target.value)}
              placeholder="CIF / agreement code"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {t("statistical.scoring.indicators")}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-[11px]"
              onClick={() => setEntries((prev) => [...prev, { ...emptyEntry }])}
            >
              <Plus className="size-3" />
              {t("statistical.scoring.btn.add_indicator")}
            </Button>
          </div>
          {entries.map((entry, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Input
                className="h-8 w-48 text-xs font-mono"
                value={entry.indicator_code}
                onChange={(e) =>
                  updateEntry(index, { indicator_code: e.target.value })
                }
                placeholder="INDICATOR_CODE"
              />
              <Input
                type="number"
                className="h-8 w-20 text-xs"
                value={entry.value}
                onChange={(e) =>
                  updateEntry(index, { value: Number(e.target.value) })
                }
                aria-label={t("statistical.scoring.field.value")}
              />
              <span className="text-muted-foreground">/</span>
              <Input
                type="number"
                className="h-8 w-20 text-xs"
                value={entry.max_value}
                onChange={(e) =>
                  updateEntry(index, { max_value: Number(e.target.value) })
                }
                aria-label={t("statistical.scoring.field.max_value")}
              />
              <span className="text-muted-foreground">
                {t("statistical.scoring.field.weight")}
              </span>
              <Input
                type="number"
                className="h-8 w-20 text-xs"
                value={entry.weight}
                onChange={(e) =>
                  updateEntry(index, { weight: Number(e.target.value) })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                disabled={entries.length === 1}
                onClick={() =>
                  setEntries((prev) => prev.filter((_, i) => i !== index))
                }
                aria-label={t("common.action.delete")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {t("statistical.scoring.bands")}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-[11px]"
              onClick={() =>
                setBands((prev) => [
                  ...prev,
                  { rank_code: "", min_score: 0 },
                ])
              }
            >
              <Plus className="size-3" />
              {t("statistical.scoring.btn.add_band")}
            </Button>
          </div>
          {bands.map((band, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Input
                className="h-8 w-32 text-xs font-mono"
                value={band.rank_code}
                onChange={(e) =>
                  updateBand(index, { rank_code: e.target.value })
                }
                placeholder="A"
              />
              <span className="text-muted-foreground">
                {t("statistical.scoring.field.min_score")}
              </span>
              <Input
                type="number"
                className="h-8 w-24 text-xs"
                value={band.min_score}
                onChange={(e) =>
                  updateBand(index, { min_score: Number(e.target.value) })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-destructive"
                onClick={() =>
                  setBands((prev) => prev.filter((_, i) => i !== index))
                }
                aria-label={t("common.action.delete")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            size="sm"
            className="gap-1.5 text-xs"
            disabled={submitting}
            onClick={submit}
          >
            <Calculator className="size-3.5" />
            {submitting
              ? t("common.action.saving")
              : t("statistical.scoring.btn.compute")}
          </Button>
          {lastResult && (
            <span className="text-xs">
              {t("statistical.scoring.result")}{" "}
              <span className="font-mono font-semibold">
                {lastResult.total_score}
              </span>
              {lastResult.rank_code && (
                <Badge variant="default" className="ml-2">
                  {lastResult.rank_code}
                </Badge>
              )}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
