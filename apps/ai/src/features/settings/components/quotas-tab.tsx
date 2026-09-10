import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Gauge } from "lucide-react"
import { fetchQuotas, saveQuotas } from "../api"

export function QuotasTab() {
  const { t } = useI18n()
  const [webhookUrl, setWebhookUrl] = useState("")
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState(0)
  const [tokensUsed, setTokensUsed] = useState(0)
  const [saving, setSaving] = useState(false)

  const loadQuotas = useCallback(async () => {
    try {
      const data = await fetchQuotas()
      if (data) {
        setWebhookUrl(data.webhookUrl ?? "")
        setMonthlyTokenLimit(data.monthlyTokenLimit ?? 0)
        setTokensUsed(data.tokensUsed ?? 0)
      }
    } catch {
      // The empty state below explains that quota is not configured.
    }
  }, [])

  useEffect(() => {
    void loadQuotas()
  }, [loadQuotas])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveQuotas({ webhookUrl, monthlyTokenLimit })
      notify.success(t("ai.settings.quotas.toast.save_success"))
    } catch (err) {
      notify.error(t("ai.settings.quotas.toast.save_failed"), err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="max-w-xl shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">
            {t("ai.settings.quotas.rate.title")}
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          {t("ai.settings.quotas.rate.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 text-xs">
        <div className="space-y-1.5">
          <label className="font-medium text-foreground">{t("ai.settings.quotas.rate.monthly_token_label")}</label>
          <Input
            type="number"
            min={0}
            className="h-8 text-xs font-mono"
            value={monthlyTokenLimit}
            onChange={(e) => setMonthlyTokenLimit(Math.max(0, Number(e.target.value) || 0))}
          />
          {monthlyTokenLimit > 0 && (
            <p className="text-[10px] text-muted-foreground">
              {t("ai.settings.quotas.rate.token_usage", {
                used: tokensUsed.toLocaleString(),
                limit: monthlyTokenLimit.toLocaleString(),
              })}
            </p>
          )}
          <label className="font-medium text-foreground">{t("ai.settings.quotas.rate.webhook_label")}</label>
          <Input
            className="h-8 text-xs font-mono"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/..."
          />
          <p className="text-[10px] text-muted-foreground">
            {t("ai.settings.quotas.rate.webhook_hint")}
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button size="sm" className="text-xs" disabled={saving} onClick={handleSave}>
            {saving ? t("common.action.saving") : t("ai.settings.quotas.rate.save_btn")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
