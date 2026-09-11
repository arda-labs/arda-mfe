import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
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
} from "../api"

const emptyEntry: ScoreEntry = {
  indicator_code: "",
  value: 0,
  max_value: 10,
  weight: 1,
}

/**
 * Rank-score runtime (fe_statistical #19): resolve indicator entries + weights
 * (mdm scoring catalogs), benchmark bands, compute the weighted score and
 * persist the ranking result.
 */
export function ScoringPage() {
  const { t, formatDate } = useI18n()
  const [results, setResults] = useState<ScoreResult[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [lastResult, setLastResult] = useState<ScoreResult | null>(null)

  const [scoringTypeCode, setScoringTypeCode] = useState("CIF_CORP")
  const [subjectType, setSubjectType] = useState("CUSTOMER")
  const [subjectRef, setSubjectRef] = useState("")
  const [entries, setEntries] = useState<ScoreEntry[]>([{ ...emptyEntry }])
  const [bands, setBands] = useState<ScoreBand[]>([
    { rank_code: "C", min_score: 0 },
    { rank_code: "B", min_score: 60 },
    { rank_code: "A", min_score: 80 },
  ])

  const load = useCallback(async () => {
    try {
      setResults(await statisticalApi.listScoreResults())
    } catch {
      // keep the empty state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

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
      await load()
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
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">
              {t("statistical.scoring.title")}
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            {t("statistical.scoring.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-xs">
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
                  <SelectItem value="CUSTOMER">CUSTOMER</SelectItem>
                  <SelectItem value="AGREEMENT">AGREEMENT</SelectItem>
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
                  setBands((prev) => [...prev, { rank_code: "", min_score: 0 }])
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

      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            {t("statistical.scoring.results")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">
                    {t("statistical.scoring.col.type")}
                  </th>
                  <th className="px-3 py-2">
                    {t("statistical.scoring.col.subject")}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t("statistical.scoring.col.score")}
                  </th>
                  <th className="px-3 py-2">
                    {t("statistical.scoring.col.rank")}
                  </th>
                  <th className="px-3 py-2">
                    {t("common.field.created")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {!loading && results.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-center text-muted-foreground"
                    >
                      {t("statistical.scoring.empty")}
                    </td>
                  </tr>
                )}
                {results.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.scoring_type_code}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {row.subject_ref || "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {row.total_score}
                    </td>
                    <td className="px-3 py-2">
                      {row.rank_code ? (
                        <Badge variant="secondary">{row.rank_code}</Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
