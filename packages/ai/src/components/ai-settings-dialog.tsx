import * as React from "react"
import { useI18n } from "@workspace/i18n"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Layers,
  Loader2,
  Save,
  Server,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react"

import {
  activateAIProfile,
  createAIProfile,
  deleteAIProfile,
  fetchAISettings,
  listAIProfiles,
  saveAISettings,
  testAIConnection,
  type AISettingProfile,
  type AISettings,
  type TestConnectionResult,
} from "../settings"

type ProviderPreset = {
  id: string
  name: string
  baseUrl: string
  defaultModel: string
  popularModels: string[]
}

const PRESETS: ProviderPreset[] = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    popularModels: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.5-flash",
    popularModels: [
      "google/gemini-2.5-flash",
      "anthropic/claude-3.5-sonnet",
      "deepseek/deepseek-chat",
      "meta-llama/llama-3.3-70b-instruct",
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini (OpenAI API)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    popularModels: ["gemini-2.5-flash", "gemini-2.5-pro"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    popularModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    popularModels: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    popularModels: ["llama3.2", "qwen2.5-coder:7b", "mistral"],
  },
  {
    id: "custom",
    name: "Custom (OpenAI-compatible)",
    baseUrl: "https://",
    defaultModel: "",
    popularModels: [],
  },
]

export type AISettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: () => void
}

export function AISettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: AISettingsDialogProps) {
  const { t } = useI18n()
  const [providerType, setProviderType] = React.useState("openai")
  const [baseUrl, setBaseUrl] = React.useState("https://api.openai.com/v1")
  const [apiKey, setApiKey] = React.useState("")
  const [modelId, setModelId] = React.useState("gpt-4o")
  const [showKey, setShowKey] = React.useState(false)
  const [hasExistingKey, setHasExistingKey] = React.useState(false)

  // "idle" → fetch on open → "ready"; reset to "idle" on close via
  // handleOpenChange so no setState runs synchronously inside an effect.
  // While open and still idle the fetch is in flight → show the spinner.
  const [loadState, setLoadState] = React.useState<"idle" | "ready">("idle")
  const loading = open && loadState === "idle"
  const [testing, setTesting] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [testResult, setTestResult] = React.useState<TestConnectionResult | null>(null)
  const [saveSuccess, setSaveSuccess] = React.useState(false)

  const [profiles, setProfiles] = React.useState<AISettingProfile[]>([])
  const [profilesError, setProfilesError] = React.useState(false)
  const [profileName, setProfileName] = React.useState("")
  const [profileBusy, setProfileBusy] = React.useState(false)

  // Load existing settings on open
  React.useEffect(() => {
    if (!open || loadState !== "idle") return
    let cancelled = false
    fetchAISettings()
      .then((data: AISettings) => {
        if (cancelled) return
        if (data.providerType) setProviderType(data.providerType)
        if (data.baseUrl) setBaseUrl(data.baseUrl)
        if (data.modelId) setModelId(data.modelId)
        if (data.apiKey) setApiKey(data.apiKey)
        setHasExistingKey(Boolean(data.hasApiKey || data.apiKey))
        setLoadState("ready")
      })
      .catch(() => {
        // Keep defaults if not found
        if (!cancelled) setLoadState("ready")
      })
    return () => {
      cancelled = true
    }
  }, [open, loadState])

  // Profiles load separately: a failure surfaces as an explicit error with
  // retry instead of silently rendering an empty list (fail-open).
  React.useEffect(() => {
    if (!open) return
    listAIProfiles()
      .then((items) => {
        setProfiles(items)
        setProfilesError(false)
      })
      .catch(() => setProfilesError(true))
  }, [open])

  const refreshProfiles = React.useCallback(async () => {
    try {
      setProfiles(await listAIProfiles())
      setProfilesError(false)
    } catch {
      setProfilesError(true)
    }
  }, [])

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setProviderType(preset.id)
    if (preset.baseUrl && preset.id !== "custom") {
      setBaseUrl(preset.baseUrl)
    }
    if (preset.defaultModel) {
      setModelId(preset.defaultModel)
    }
    setTestResult(null)
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)
    setSaveSuccess(false)

    try {
      const data = await testAIConnection({
        providerType,
        baseUrl,
        apiKey,
        modelId,
      })
      setTestResult(data)
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "Network error",
      })
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveSuccess(false)
    setTestResult(null)

    try {
      await saveAISettings({
        providerType,
        baseUrl,
        apiKey,
        modelId,
        temperature: 0.2,
        isActive: true,
      })
      setSaveSuccess(true)
      setHasExistingKey(true)
      onSaved?.()
      setTimeout(() => {
        onOpenChange(false)
      }, 1000)
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : "Lỗi lưu cấu hình",
      })
    } finally {
      setSaving(false)
    }
  }

  const currentPreset = PRESETS.find((p) => p.id === providerType)

  // Reset transient feedback when the dialog closes. Done in the close
  // handler (not an effect) so no setState runs synchronously during render.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setTestResult(null)
      setSaveSuccess(false)
      setProfilesError(false)
      setLoadState("idle")
    }
    onOpenChange(next)
  }

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return
    setProfileBusy(true)
    try {
      await createAIProfile({
        name: profileName.trim(),
        providerType,
        baseUrl,
        // Masked/empty key = reuse the stored key server-side.
        apiKey: apiKey.includes("...") ? "" : apiKey,
        modelId,
        temperature: 0.2,
      })
      setProfileName("")
      await refreshProfiles()
    } catch {
      setTestResult({ success: false, error: "Không lưu được profile" })
    } finally {
      setProfileBusy(false)
    }
  }

  const handleActivateProfile = async (id: string) => {
    setProfileBusy(true)
    try {
      await activateAIProfile(id)
      const data = await fetchAISettings()
      if (data.baseUrl) setBaseUrl(data.baseUrl)
      if (data.modelId) setModelId(data.modelId)
      setHasExistingKey(Boolean(data.hasApiKey))
      setSaveSuccess(false)
      setTestResult(null)
      await refreshProfiles()
    } catch {
      setTestResult({ success: false, error: "Không kích hoạt được profile" })
    } finally {
      setProfileBusy(false)
    }
  }

  const handleDeleteProfile = async (id: string) => {
    setProfileBusy(true)
    try {
      await deleteAIProfile(id)
      await refreshProfiles()
    } catch {
      setTestResult({ success: false, error: "Không xóa được profile" })
    } finally {
      setProfileBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                {t("ai.settings.title") || "Cấu hình AI Provider (BYOK)"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {t("ai.settings.description") ||
                  "Thiết lập nguồn API Token và Model ID sử dụng cho trợ lý Olorin."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            <span>{t("common.loading") || "Đang tải cấu hình..."}</span>
          </div>
        ) : (
          <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                {t("ai.settings.preset") || "Nhà cung cấp phổ biến"}
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {PRESETS.map((preset) => {
                  const active = providerType === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`flex flex-col items-start px-2.5 py-2 rounded-lg border text-left text-xs transition-all ${
                        active
                          ? "border-primary bg-primary/5 font-semibold text-foreground shadow-2xs"
                          : "border-border/60 hover:border-border hover:bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      <span className="truncate w-full">{preset.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Base URL */}
            <div className="space-y-1.5">
              <Label htmlFor="ai-base-url" className="text-xs font-medium">
                {t("ai.settings.baseUrl") || "Base URL (OpenAI-compatible)"}
              </Label>
              <div className="relative">
                <Server className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ai-base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="pl-8 text-xs font-mono"
                />
              </div>
            </div>

            {/* Model ID */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-model-id" className="text-xs font-medium">
                  {t("ai.settings.modelId") || "Model ID"}
                </Label>
              </div>
              <Input
                id="ai-model-id"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="gpt-4o-mini, gemini-2.5-flash, deepseek-chat..."
                className="text-xs font-mono"
              />
              {currentPreset && currentPreset.popularModels.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground self-center">
                    Gợi ý:
                  </span>
                  {currentPreset.popularModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModelId(m)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        modelId === m
                          ? "bg-primary/10 border-primary/30 text-primary font-medium"
                          : "bg-muted/30 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="ai-api-key" className="text-xs font-medium">
                  {t("ai.settings.apiKey") || "API Key"}
                </Label>
                {hasExistingKey && !apiKey.includes("...") && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Đã lưu key trong DB
                  </span>
                )}
              </div>
              <div className="relative">
                <Key className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="ai-api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    hasExistingKey ? "•••••••••••••••• (giữ nguyên key cũ)" : "sk-..."
                  }
                  className="pl-8 pr-9 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Khóa được mã hóa AES-256-GCM an toàn trước khi lưu vào Database.
              </p>
            </div>

            {/* Test Status Banner */}
            {testResult && (
              <div
                className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${
                  testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-destructive/10 border-destructive/30 text-destructive dark:text-destructive-foreground"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <XCircle className="size-4 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">
                    {testResult.success
                      ? `Kết nối thành công (${testResult.latencyMs}ms)`
                      : "Kết nối thất bại"}
                  </div>
                  <div className="text-[11px] opacity-90 mt-0.5 break-words">
                    {testResult.message || testResult.error}
                  </div>
                </div>
              </div>
            )}

            {saveSuccess && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                <CheckCircle2 className="size-4" />
                <span>Cấu hình AI đã được lưu và kích hoạt tức thì!</span>
              </div>
            )}

            {/* Saved profiles */}
            <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Layers className="size-3.5 text-primary" />
                {t("ai.settings.profiles.title") || "Profiles đã lưu"}
              </div>

              {profilesError ? (
                <div className="flex items-center justify-between gap-2 text-[11px] text-destructive">
                  <span>
                    {t("ai.settings.profiles.load_error") || "Không tải được danh sách profiles."}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={profileBusy}
                    onClick={() => void refreshProfiles()}
                    className="h-6 px-2 text-[11px]"
                  >
                    {t("common.action.retry") || "Thử lại"}
                  </Button>
                </div>
              ) : profiles.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  {t("ai.settings.profiles.empty") || "Chưa có profile nào. Lưu cấu hình hiện tại để switch nhanh sau này."}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {profiles.map((profile) => (
                    <li
                      key={profile.id}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                        profile.isActive ? "border-primary/40 bg-primary/5" : "bg-background"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-foreground">{profile.name}</span>
                          {profile.isActive && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px] font-normal">
                              {t("ai.settings.profiles.active") || "đang dùng"}
                            </Badge>
                          )}
                        </div>
                        <span className="block truncate text-[11px] text-muted-foreground font-mono">
                          {profile.modelId} · {profile.baseUrl}
                        </span>
                      </div>
                      {!profile.isActive && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={profileBusy}
                          onClick={() => void handleActivateProfile(profile.id)}
                          className="h-6 px-2 text-[11px]"
                        >
                          {t("ai.settings.profiles.activate") || "Dùng"}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={profileBusy}
                        onClick={() => void handleDeleteProfile(profile.id)}
                        aria-label={t("ai.settings.profiles.delete") || "Xóa profile"}
                        className="size-6 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                <Input
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder={t("ai.settings.profiles.name_placeholder") || "Tên profile (vd: b.ai deepseek)"}
                  className="h-7 flex-1 text-[11px]"
                  maxLength={128}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={profileBusy || !profileName.trim() || !baseUrl || !modelId}
                  onClick={() => void handleSaveProfile()}
                  className="h-7 px-2 text-[11px]"
                >
                  {profileBusy ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Save className="size-3" />
                  )}
                  {t("ai.settings.profiles.save_current") || "Lưu hiện tại"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="px-6 py-3 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={testing || saving || !baseUrl || !modelId}
            className="text-xs h-8"
          >
            {testing ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Đang test...
              </>
            ) : (
              "Kiểm tra kết nối"
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Đóng
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || !baseUrl || !modelId}
              className="text-xs h-8"
            >
              {saving ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                "Lưu cấu hình"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
