import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Switch } from "@workspace/ui/components/switch"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  CheckCircle2,
  FileText,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react"
import { fetchGuardrails, saveGuardrails } from "../api"

export function GuardrailsSafetyTab() {
  const { t } = useI18n()
  const [promptInjectionDefense, setPromptInjectionDefense] = useState(true)
  const [piiMasking, setPiiMasking] = useState(true)
  const [hallucinationCheck, setHallucinationCheck] = useState(true)
  const [zeroRetention, setZeroRetention] = useState(true)
  const [injectionThreshold, setInjectionThreshold] = useState(0.85)
  const [saving, setSaving] = useState(false)

  const loadGuardrails = useCallback(async () => {
    try {
      const data = await fetchGuardrails()
      if (data) {
        setPromptInjectionDefense(data.promptInjectionDefense)
        setPiiMasking(data.piiMasking)
        setHallucinationCheck(data.hallucinationCheck)
        setZeroRetention(data.zeroRetention)
        if (data.injectionThreshold) {
          setInjectionThreshold(data.injectionThreshold)
        }
      }
    } catch {
      // Keep defaults
    }
  }, [])

  useEffect(() => {
    void loadGuardrails()
  }, [loadGuardrails])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveGuardrails({
        promptInjectionDefense,
        piiMasking,
        hallucinationCheck,
        zeroRetention,
        injectionThreshold,
      })
      notify.success(t("ai.settings.guardrails.toast.save_success"))
    } catch (err) {
      notify.error(t("ai.settings.guardrails.toast.save_failed"), err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 min-w-0">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Main Controls */}
        <Card className="shadow-xs lg:col-span-8 border-border min-w-0">
          <CardHeader className="pb-3 border-b border-border/70">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-foreground shrink-0" />
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {t("ai.settings.guardrails.main.title")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t("ai.settings.guardrails.main.description")}
                  </CardDescription>
                </div>
              </div>
              <Status variant="success" className="text-[10px]">
                <StatusIndicator />
                <StatusLabel>{t("ai.settings.guardrails.status.policy_active")}</StatusLabel>
              </Status>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 text-xs">
            {/* Guard 1: Prompt Injection */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">{t("ai.settings.guardrails.injection.title")}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">Input Guard</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t("ai.settings.guardrails.injection.description")}
                  </p>
                </div>
                <Switch
                  checked={promptInjectionDefense}
                  onCheckedChange={setPromptInjectionDefense}
                  aria-label="Toggle Prompt Injection Defense"
                />
              </div>

              {promptInjectionDefense && (
                <div className="flex flex-wrap items-center gap-3 border-t border-border/70 pt-3">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("ai.settings.guardrails.injection.threshold_label")}
                  </span>
                  <input
                    type="range"
                    min="0.6"
                    max="0.95"
                    step="0.05"
                    value={injectionThreshold}
                    onChange={(e) => setInjectionThreshold(parseFloat(e.target.value))}
                    className="w-32"
                  />
                  <span className="font-mono font-bold text-foreground">{injectionThreshold}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{t("ai.settings.guardrails.injection.threshold_default")}</span>
                </div>
              )}
            </div>

            {/* Guard 2: PII / DLP */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">{t("ai.settings.guardrails.pii.title")}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">Privacy Guard</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t("ai.settings.guardrails.pii.description")}
                  </p>
                </div>
                <Switch
                  checked={piiMasking}
                  onCheckedChange={setPiiMasking}
                  aria-label="Toggle PII Masking"
                />
              </div>

              {/* Technical DLP Audit Log Inspector */}
              {piiMasking && (
                <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground border-b border-border/60 pb-1.5">
                    <span className="flex items-center gap-1.5 font-mono text-foreground">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {t("ai.settings.guardrails.pii.audit_title")}
                    </span>
                    <span className="font-mono text-[9.5px]">Zero Information Leakage</span>
                  </div>
                  <div className="space-y-1.5 font-mono text-[10.5px] leading-relaxed">
                    <div className="rounded border border-border bg-background p-2 text-muted-foreground">
                      <strong className="text-foreground">{t("ai.settings.guardrails.pii.raw_label")}</strong> {t("ai.settings.guardrails.pii.raw_sample")}
                    </div>
                    <div className="rounded border border-border bg-card p-2 text-foreground">
                      <strong className="text-foreground">{t("ai.settings.guardrails.pii.payload_label")}</strong> {t("ai.settings.guardrails.pii.payload_prefix")}{" "}
                      <span className="border rounded px-1 py-0.5 bg-muted font-bold">[PERSON_1]</span> ({t("ai.settings.guardrails.pii.cccd_label")}:{" "}
                      <span className="border rounded px-1 py-0.5 bg-muted font-bold">[CCCD_REDACTED]</span>, {t("ai.settings.guardrails.pii.stk_label")}:{" "}
                      <span className="border rounded px-1 py-0.5 bg-muted font-bold">[BANK_ACCOUNT_REDACTED]</span>)
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Guard 3: Hallucination Check */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">{t("ai.settings.guardrails.hallucination.title")}</span>
                    <Badge variant="outline" className="text-[10px] font-mono">Output Guard</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {t("ai.settings.guardrails.hallucination.description")}
                  </p>
                </div>
                <Switch
                  checked={hallucinationCheck}
                  onCheckedChange={setHallucinationCheck}
                  aria-label="Toggle Hallucination Detection"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" className="text-xs" onClick={handleSave} disabled={saving}>
                {saving ? t("common.action.saving") : t("ai.settings.guardrails.btn.save")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Policy Cards */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="shadow-xs border-border">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-foreground" />
                <CardTitle className="text-sm font-semibold">
                  {t("ai.settings.guardrails.privacy.title")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="rounded-lg border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">Zero Data Retention (ZDR)</span>
                  <Switch
                    checked={zeroRetention}
                    onCheckedChange={setZeroRetention}
                    aria-label="Toggle Zero Data Retention"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t("ai.settings.guardrails.privacy.zdr_description")}
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  {t("ai.settings.guardrails.privacy.encryption_title")}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {t("ai.settings.guardrails.privacy.encryption_description")}
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{t("ai.settings.guardrails.privacy.compliance")}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
