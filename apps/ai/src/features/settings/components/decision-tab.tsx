import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"
import { AlertCircle, CheckCircle2, GitBranch, Loader2 } from "lucide-react"
import { fetchDecisionSettings, saveDecisionSettings, testDecisionSettings } from "../api/decision"
import { decisionSettingsSchema, defaultDecisionSettings } from "../schema"
import type { DecisionSettings, DecisionTestResult } from "../types"

export function DecisionTab() {
  const { t } = useI18n()
  const [settings, setSettings] = useState(defaultDecisionSettings)
  const [apiKey, setApiKey] = useState("")
  const [clearKey, setClearKey] = useState(false)
  const [enabledBeforeClear, setEnabledBeforeClear] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState<"save" | "test" | null>(null)
  const [testResult, setTestResult] = useState<DecisionTestResult | null>(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let active = true
    fetchDecisionSettings().then((data) => {
      if (active) { setSettings(data); setLoading(false); setLoadFailed(false) }
    }).catch(() => {
      if (active) { setLoading(false); setLoadFailed(true) }
    })
    return () => { active = false }
  }, [reload])

  const change = (next: Partial<DecisionSettings>) => {
    setSettings((current) => ({ ...current, ...next }))
    setDirty(true)
    setTestResult(null)
  }

  const toggleClearKey = () => {
    setApiKey("")
    if (clearKey) {
      setClearKey(false)
      if (enabledBeforeClear !== null) change({ enabled: enabledBeforeClear })
      setEnabledBeforeClear(null)
      return
    }
    setEnabledBeforeClear(settings.enabled)
    setClearKey(true)
    change({ enabled: false })
  }

  const submit = async (action: "save" | "test") => {
    const payload = {
      enabled: settings.enabled,
      model_id: settings.model_id,
      min_confidence: settings.min_confidence,
      ...(clearKey ? { api_key: "" } : apiKey.trim() ? { api_key: apiKey.trim() } : {}),
    }
    if (!decisionSettingsSchema.safeParse(payload).success) {
      notify.error(t("ai.settings.decision.validation")); return
    }
    if ((settings.enabled || action === "test") && !(apiKey.trim() || (settings.has_api_key && !clearKey))) {
      notify.error(t("ai.settings.decision.key_required")); return
    }
    setBusy(action)
    setTestResult(null)
    try {
      if (action === "test") {
        setTestResult(await testDecisionSettings(payload))
      } else {
        const data = await saveDecisionSettings(payload)
        setSettings(data)
        setApiKey("")
        setClearKey(false)
        setEnabledBeforeClear(null)
        setDirty(false)
        notify.success(t("ai.settings.decision.saved"))
      }
    } catch (error) {
      notify.error(t("ai.settings.decision.failed"), error)
    } finally { setBusy(null) }
  }

  if (loading) return <div role="status" className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t("ai.settings.decision.loading")}</div>
  if (loadFailed) return <div role="alert" className="space-y-3 rounded-lg border p-5 text-sm"><p>{t("ai.settings.decision.load_failed")}</p><Button variant="outline" onClick={() => { setLoading(true); setReload((value) => value + 1) }}>{t("ai.settings.decision.retry")}</Button></div>

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><GitBranch className="size-4 text-primary" />{t("ai.settings.decision.title")}</CardTitle>
          <CardDescription>{t("ai.settings.decision.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => { event.preventDefault(); void submit("save") }}>
            <fieldset disabled={busy !== null} className="space-y-5 disabled:opacity-70">
              <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-1"><Label htmlFor="decision-enabled">{t("ai.settings.decision.enable")}</Label><p id="decision-enable-hint" className="text-xs text-muted-foreground">{t("ai.settings.decision.enable_hint")}</p></div>
                <Switch id="decision-enabled" aria-describedby="decision-enable-hint" checked={settings.enabled} onCheckedChange={(enabled) => change({ enabled })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="decision-provider">{t("ai.settings.decision.provider")}</Label><Input id="decision-provider" value="OpenCode Zen · System One" readOnly /></div>
                <div className="space-y-2"><Label htmlFor="decision-model">{t("ai.settings.decision.model")}</Label>
                  <Select value={settings.model_id} onValueChange={(value) => change({ model_id: value as DecisionSettings["model_id"] })} disabled={busy !== null}>
                    <SelectTrigger id="decision-model"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="jev-1.13-free">Jev 1.13 Free</SelectItem><SelectItem value="jev-1.13">Jev 1.13</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              {settings.model_id === "jev-1.13-free" && <p className="text-xs text-muted-foreground">{t("ai.settings.decision.free_hint")}</p>}
              <div className="space-y-2"><Label htmlFor="decision-key">{t("ai.settings.decision.key")}</Label>
                <Input id="decision-key" type="password" autoComplete="new-password" value={apiKey} maxLength={4096} aria-describedby="decision-key-hint" onChange={(event) => { setApiKey(event.target.value); setClearKey(false); setDirty(true); setTestResult(null) }} />
                <p id="decision-key-hint" className="text-xs text-muted-foreground">{t(clearKey ? "ai.settings.decision.key_cleared" : settings.has_api_key ? "ai.settings.decision.key_saved" : "ai.settings.decision.key_hint")}</p>
                {settings.has_api_key && <Button type="button" variant="ghost" size="sm" onClick={toggleClearKey}>{t(clearKey ? "ai.settings.decision.keep_key" : "ai.settings.decision.clear_key")}</Button>}
              </div>
              <div className="space-y-2"><Label htmlFor="decision-confidence">{t("ai.settings.decision.confidence")}</Label>
                <Input id="decision-confidence" className="w-32" type="number" min={50} max={100} step={1} value={Math.round(settings.min_confidence * 100)} aria-describedby="decision-confidence-hint" onChange={(event) => change({ min_confidence: Number(event.target.value) / 100 })} />
                <p id="decision-confidence-hint" className="text-xs text-muted-foreground">{t("ai.settings.decision.confidence_hint")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <Button type="submit" disabled={!dirty}>{busy === "save" && <Loader2 className="size-4 animate-spin" />}{t("ai.settings.decision.save")}</Button>
                <Button type="button" variant="outline" onClick={() => void submit("test")}>{busy === "test" && <Loader2 className="size-4 animate-spin" />}{t("ai.settings.decision.test")}</Button>
                {dirty && <span className="text-xs text-muted-foreground">{t("ai.settings.decision.unsaved")}</span>}
              </div>
            </fieldset>
          </form>
          {testResult && <div role="status" className="mt-4 space-y-2 rounded-lg border p-3 text-sm">
            <p className="flex items-center gap-2">{testResult.success ? <CheckCircle2 className="size-4 text-primary" /> : <AlertCircle className="size-4 text-destructive" />}{t(testResult.success ? "ai.settings.decision.test_ok" : "ai.settings.decision.test_failed")}</p>
            {testResult.success && <p className="text-xs text-muted-foreground">{t("ai.settings.decision.test_detail", { skill: t(`ai.settings.decision.skills.${testResult.skill ?? "general"}`), confidence: Math.round((testResult.confidence ?? 0) * 100), latency: testResult.latency_ms })}</p>}
            <p className="text-xs text-muted-foreground">{t("ai.settings.decision.test_hint")}</p>
          </div>}
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader><CardTitle className="text-sm">{t("ai.settings.decision.role_title")}</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-1"><p className="font-medium">{t("ai.settings.decision.role_decision")}</p><p className="text-muted-foreground">{t("ai.settings.decision.role_decision_hint")}</p></div>
          <div className="space-y-1"><p className="font-medium">{t("ai.settings.decision.role_chat")}</p><p className="text-muted-foreground">{t("ai.settings.decision.role_chat_hint")}</p></div>
          <p className="border-t pt-4 text-xs text-muted-foreground">{t("ai.settings.decision.runtime_hint")}</p>
        </CardContent>
      </Card>
    </div>
  )
}
