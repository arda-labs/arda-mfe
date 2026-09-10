import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Cpu, Eye, EyeOff, PlugZap } from "lucide-react"
import { fetchAISettings, saveAISettings, testAIConnection } from "../api"

export function ModelConfigTab() {
  const { t } = useI18n()
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [modelId, setModelId] = useState("")
  const [hasApiKey, setHasApiKey] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testMessage, setTestMessage] = useState("")
  const [testError, setTestError] = useState("")

  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchAISettings()
      setBaseUrl(data.baseUrl ?? "")
      setApiKey(data.apiKey ?? "")
      setModelId(data.modelId ?? "")
      setHasApiKey(Boolean(data.hasApiKey))
    } catch {
      // Empty form; the user configures from scratch.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [loadSettings])

  const handleTest = async () => {
    setTesting(true)
    setTestMessage("")
    setTestError("")
    try {
      const res = await testAIConnection({ baseUrl, apiKey, modelId })
      if (res.success) {
        setTestMessage(
          t("ai.settings.model.test.success", { latency: res.latencyMs ?? 0 })
        )
      } else {
        setTestError(res.error || t("ai.settings.model.test.failed"))
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : String(err))
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveAISettings({ baseUrl, apiKey, modelId })
      notify.success(t("ai.settings.model.toast.save_success"))
      await loadSettings()
    } catch (err) {
      notify.error(
        t("ai.settings.model.toast.save_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setSaving(false)
    }
  }

  const canSave = baseUrl.trim() !== "" && modelId.trim() !== "" && (apiKey.trim() !== "" || hasApiKey)

  return (
    <Card className="max-w-xl shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-semibold">
            {t("ai.settings.model.title")}
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          {t("ai.settings.model.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0 text-xs">
        <div className="space-y-1.5">
          <label className="font-medium text-foreground">{t("ai.settings.model.field.base_url")}</label>
          <Input
            className="h-8 text-xs font-mono"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://ai-gateway.example.com/v1"
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-foreground">{t("ai.settings.model.field.model_id")}</label>
          <Input
            className="h-8 text-xs font-mono"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            placeholder="gpt-4o-mini"
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-medium text-foreground">{t("ai.settings.model.field.api_key")}</label>
          <div className="flex items-center gap-2">
            <Input
              type={showKey ? "text" : "password"}
              className="h-8 text-xs font-mono"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasApiKey ? t("ai.settings.model.placeholder.api_key_existing") : "sk-..."}
              disabled={loading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setShowKey((prev) => !prev)}
              aria-label={showKey ? t("ai.settings.model.btn.hide_key") : t("ai.settings.model.btn.show_key")}
            >
              {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </Button>
          </div>
          {hasApiKey && (
            <p className="text-[10px] text-muted-foreground">
              {t("ai.settings.model.api_key_saved")}
            </p>
          )}
        </div>

        {(testMessage || testError) && (
          <p className={`text-[11px] ${testError ? "text-destructive" : "text-emerald-600"}`}>
            {testError || testMessage}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            disabled={testing || loading}
            onClick={handleTest}
          >
            <PlugZap className="size-3.5" />
            {testing ? t("ai.settings.model.btn.testing") : t("ai.settings.model.btn.test")}
          </Button>
          <Button size="sm" className="text-xs" disabled={!canSave || saving} onClick={handleSave}>
            {saving ? t("common.action.saving") : t("ai.settings.model.btn.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
