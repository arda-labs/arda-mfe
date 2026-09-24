import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Slider } from "@workspace/ui/components/slider"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"
import { AlertCircle, CheckCircle2, GitBranch, Loader2, Sparkles } from "lucide-react"
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
  const [customModel, setCustomModel] = useState(false)

  useEffect(() => {
    let active = true
    fetchDecisionSettings().then((data) => {
      if (active) {
        setSettings(data)
        setCustomModel(data.model_id !== "jev-1.13-free" && data.model_id !== "jev-1.13")
        setLoading(false)
        setLoadFailed(false)
      }
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
      model_id: settings.model_id.trim(),
      min_confidence: settings.min_confidence,
      ...(clearKey ? { api_key: "" } : apiKey.trim() ? { api_key: apiKey.trim() } : {}),
    }
    if (!decisionSettingsSchema.safeParse(payload).success) {
      notify.error(t("ai.settings.decision.validation"))
      return
    }
    if ((settings.enabled || action === "test") && !(apiKey.trim() || (settings.has_api_key && !clearKey))) {
      notify.error(t("ai.settings.decision.key_required"))
      return
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

  const confidencePct = Math.round(settings.min_confidence * 100)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><GitBranch className="size-4 text-primary" />{t("ai.settings.decision.title")}</CardTitle>
          <CardDescription>{t("ai.settings.decision.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => { event.preventDefault(); void submit("save") }}>
            <fieldset disabled={busy !== null} className="space-y-5 disabled:opacity-70">
              <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <Label htmlFor="decision-enabled">{t("ai.settings.decision.enable")}</Label>
                  <p id="decision-enable-hint" className="text-xs text-muted-foreground">{t("ai.settings.decision.enable_hint")}</p>
                </div>
                <Switch id="decision-enabled" aria-describedby="decision-enable-hint" checked={settings.enabled} onCheckedChange={(enabled) => change({ enabled })} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="decision-provider">{t("ai.settings.decision.provider")}</Label>
                  <Input id="decision-provider" value="OpenCode Zen · System One" readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="decision-model">{t("ai.settings.decision.model")}</Label>
                  <Select
                    value={customModel ? "custom" : settings.model_id}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setCustomModel(true)
                      } else {
                        setCustomModel(false)
                        change({ model_id: value })
                      }
                    }}
                    disabled={busy !== null}
                  >
                    <SelectTrigger id="decision-model"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jev-1.13-free">Jev 1.13 Free</SelectItem>
                      <SelectItem value="jev-1.13">Jev 1.13</SelectItem>
                      <SelectItem value="custom">{t("ai.settings.decision.custom_model")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {customModel && (
                <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                  <Label htmlFor="decision-custom-model">{t("ai.settings.decision.custom_model")}</Label>
                  <Input
                    id="decision-custom-model"
                    placeholder="ví dụ: jev-latest, typesafe/jev-2"
                    value={settings.model_id}
                    onChange={(e) => change({ model_id: e.target.value })}
                    maxLength={128}
                  />
                  <p className="text-xs text-muted-foreground">{t("ai.settings.decision.custom_model_hint")}</p>
                </div>
              )}

              {settings.model_id === "jev-1.13-free" && !customModel && (
                <p className="text-xs text-muted-foreground">{t("ai.settings.decision.free_hint")}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="decision-key">{t("ai.settings.decision.key")}</Label>
                <Input
                  id="decision-key"
                  type="password"
                  autoComplete="new-password"
                  value={apiKey}
                  maxLength={4096}
                  aria-describedby="decision-key-hint"
                  onChange={(event) => { setApiKey(event.target.value); setClearKey(false); setDirty(true); setTestResult(null) }}
                />
                <p id="decision-key-hint" className="text-xs text-muted-foreground">
                  {t(clearKey ? "ai.settings.decision.key_cleared" : settings.has_api_key ? "ai.settings.decision.key_saved" : "ai.settings.decision.key_hint")}
                </p>
                {settings.has_api_key && (
                  <Button type="button" variant="ghost" size="sm" onClick={toggleClearKey}>
                    {t(clearKey ? "ai.settings.decision.keep_key" : "ai.settings.decision.clear_key")}
                  </Button>
                )}
              </div>

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="decision-confidence">{t("ai.settings.decision.confidence")}</Label>
                  <Badge variant={confidencePct < 75 ? "warning" : confidencePct <= 85 ? "default" : "info"}>
                    {confidencePct}%
                  </Badge>
                </div>
                <Slider
                  id="decision-confidence"
                  min={50}
                  max={100}
                  step={1}
                  value={[confidencePct]}
                  onValueChange={([val]) => change({ min_confidence: (val ?? 80) / 100 })}
                  aria-describedby="decision-confidence-hint"
                />
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>50%</span>
                  <span className="font-medium text-foreground">
                    {t(confidencePct < 75 ? "ai.settings.decision.confidence_level_sensitive" : confidencePct <= 85 ? "ai.settings.decision.confidence_level_balanced" : "ai.settings.decision.confidence_level_strict")}
                  </span>
                  <span>100%</span>
                </div>
                <p id="decision-confidence-hint" className="text-xs text-muted-foreground pt-1 border-t">
                  {t("ai.settings.decision.confidence_hint")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t pt-4">
                <Button type="submit" disabled={!dirty}>
                  {busy === "save" && <Loader2 className="size-4 animate-spin" />}
                  {t("ai.settings.decision.save")}
                </Button>
                <Button type="button" variant="outline" onClick={() => void submit("test")}>
                  {busy === "test" && <Loader2 className="size-4 animate-spin" />}
                  {t("ai.settings.decision.test")}
                </Button>
                {dirty && <span className="text-xs text-muted-foreground">{t("ai.settings.decision.unsaved")}</span>}
              </div>
            </fieldset>
          </form>

          {testResult && (
            <div
              role="status"
              className={cn(
                "mt-4 space-y-3 rounded-lg border p-4 text-sm transition-all",
                testResult.success ? "border-emerald-500/20 bg-emerald-500/5" : "border-destructive/20 bg-destructive/5"
              )}
            >
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-medium">
                  {testResult.success ? <CheckCircle2 className="size-4 text-emerald-600" /> : <AlertCircle className="size-4 text-destructive" />}
                  {t(testResult.success ? "ai.settings.decision.test_ok" : "ai.settings.decision.test_failed")}
                </p>
                {testResult.success && testResult.latency_ms !== undefined && (
                  <Badge variant="outline" className="text-xs font-mono">
                    {testResult.latency_ms} ms
                  </Badge>
                )}
              </div>
              {testResult.success && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default" className="text-xs">
                    {t(`ai.settings.decision.skills.${testResult.skill ?? "general"}`)}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Confidence: {Math.round((testResult.confidence ?? 0) * 100)}%
                  </Badge>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t("ai.settings.decision.test_hint")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("ai.settings.decision.role_title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400">
                {t("ai.settings.decision.role_decision")}
              </p>
              <p className="text-xs text-muted-foreground">{t("ai.settings.decision.role_decision_hint")}</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
                {t("ai.settings.decision.role_chat")}
              </p>
              <p className="text-xs text-muted-foreground">{t("ai.settings.decision.role_chat_hint")}</p>
            </div>
            <p className="border-t pt-3 text-xs text-muted-foreground">{t("ai.settings.decision.runtime_hint")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              {t("ai.settings.decision.skill_packs_title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-xs">
            <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-violet-600 dark:text-violet-400">{t("ai.settings.decision.skills.loan_portfolio")}</span>
                <code className="text-[10px] text-muted-foreground">loan_portfolio</code>
              </div>
              <p className="text-muted-foreground">{t("ai.settings.decision.skill_loan_desc")}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-sky-600 dark:text-sky-400">{t("ai.settings.decision.skills.report")}</span>
                <code className="text-[10px] text-muted-foreground">report</code>
              </div>
              <p className="text-muted-foreground">{t("ai.settings.decision.skill_report_desc")}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-emerald-600 dark:text-emerald-400">{t("ai.settings.decision.skills.knowledge")}</span>
                <code className="text-[10px] text-muted-foreground">knowledge</code>
              </div>
              <p className="text-muted-foreground">{t("ai.settings.decision.skill_knowledge_desc")}</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-muted-foreground">{t("ai.settings.decision.skills.general")}</span>
                <code className="text-[10px] text-muted-foreground">general</code>
              </div>
              <p className="text-muted-foreground">{t("ai.settings.decision.skill_general_desc")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
