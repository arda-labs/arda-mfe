import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { ShieldAlert } from "lucide-react"
import { fetchAgentSettings, saveAgentSettings } from "../api"

type ActRisk = "low" | "medium"

// AgentTab configures Ask/Act mode for the tenant. Act mode lets the assistant
// run low/medium-risk confirm tools without an approval when the actor holds the
// permission; high-risk actions always require approval. Off by default.
export function AgentTab() {
  const { t } = useI18n()
  const [enabled, setEnabled] = useState(false)
  const [risk, setRisk] = useState<ActRisk>("medium")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await fetchAgentSettings()
      if (data) {
        setEnabled(Boolean(data.act_mode_enabled))
        setRisk(data.act_mode_max_risk === "low" ? "low" : "medium")
      }
    } catch {
      // Default off is the safe fallback; the card explains the state.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (nextEnabled: boolean, nextRisk: ActRisk) => {
    setSaving(true)
    try {
      await saveAgentSettings({ act_mode_enabled: nextEnabled, act_mode_max_risk: nextRisk })
      notify.success(t("ai.settings.agent.toast.save_success"))
    } catch (err) {
      notify.error(
        t("ai.settings.agent.toast.save_failed"),
        err instanceof Error ? err.message : String(err)
      )
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="max-w-xl shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">{t("ai.settings.agent.title")}</CardTitle>
        </div>
        <CardDescription className="text-xs">{t("ai.settings.agent.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 text-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">{t("ai.settings.agent.enable_label")}</p>
            <p className="text-[10px] text-muted-foreground">{t("ai.settings.agent.enable_hint")}</p>
          </div>
          <Switch
            checked={enabled}
            disabled={saving || loading}
            onCheckedChange={(value) => {
              setEnabled(value)
              void save(value, risk)
            }}
          />
        </div>

        <div className="space-y-1.5">
          <p className="font-medium text-foreground">{t("ai.settings.agent.max_risk_label")}</p>
          <Select
            value={risk}
            disabled={saving || loading || !enabled}
            onValueChange={(value) => {
              const next = value === "low" ? "low" : "medium"
              setRisk(next)
              void save(enabled, next)
            }}
          >
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low" className="text-xs">
                {t("ai.settings.agent.risk_low")}
              </SelectItem>
              <SelectItem value="medium" className="text-xs">
                {t("ai.settings.agent.risk_medium")}
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">{t("ai.settings.agent.max_risk_hint")}</p>
        </div>
      </CardContent>
    </Card>
  )
}
