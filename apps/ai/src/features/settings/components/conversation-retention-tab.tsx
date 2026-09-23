import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Clock3, Loader2, Save, ShieldCheck } from "lucide-react"
import { fetchConversationRetention, saveConversationRetention } from "../api"

export function ConversationRetentionTab() {
  const { t } = useI18n()
  const [months, setMonths] = useState("1")
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const value = await fetchConversationRetention()
      setMonths(String(value.trash_retention_months || 1))
      setLoadFailed(false)
    } catch {
      setLoadFailed(true)
      notify.error(t("ai.settings.retention.load_failed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { void load() }, [load])

  const save = async () => {
    setSaving(true)
    try {
      const value = await saveConversationRetention(Number(months))
      setMonths(String(value.trash_retention_months))
      notify.success(t("ai.settings.retention.saved"))
    } catch (error) {
      notify.error(t("ai.settings.retention.save_failed"), error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock3 className="size-4 text-primary" />
          {t("ai.settings.retention.title")}
        </CardTitle>
        <CardDescription>
          {t("ai.settings.retention.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex gap-3 rounded-lg border bg-muted/30 p-4">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {t("ai.settings.retention.default_title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("ai.settings.retention.default_hint")}
            </p>
          </div>
        </div>
        {loadFailed && (
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {t("ai.settings.retention.retry")}
          </Button>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full space-y-2 sm:max-w-xs">
            <label className="text-sm font-medium" htmlFor="trash-retention">
              {t("ai.settings.retention.period")}
            </label>
            <Select
              value={months}
              onValueChange={setMonths}
              disabled={loading || saving}
            >
              <SelectTrigger id="trash-retention">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, index) => index + 1).map(
                  (month) => (
                    <SelectItem key={month} value={String(month)}>
                      {t("ai.settings.retention.months", { count: month })}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("ai.settings.retention.maximum")}
            </p>
          </div>
          <Button
            onClick={() => void save()}
            disabled={loading || loadFailed || saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {t("ai.settings.retention.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
