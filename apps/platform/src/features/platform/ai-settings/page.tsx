import * as React from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Bot,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Globe,
  Key,
  Layers,
  Lock,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"

interface AISettings {
  providerType: string
  baseUrl: string
  apiKey: string
  modelId: string
  temperature: number
  isActive: boolean
  hasApiKey?: boolean
}

interface TestResult {
  success: boolean
  latencyMs?: number
  modelId?: string
  message?: string
  error?: string
}

const PRESETS = [
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    models: ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "anthropic/claude-3.5-sonnet",
    models: [
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-4o",
      "google/gemini-2.0-flash-001",
      "deepseek/deepseek-chat",
    ],
  },
  {
    id: "gemini",
    name: "Google Gemini (OpenAI API)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    models: ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "llama3.2",
    models: ["llama3.2", "qwen2.5", "mistral", "deepseek-r1"],
  },
  {
    id: "custom",
    name: "Tùy chỉnh (OpenAI-compatible)",
    baseUrl: "",
    defaultModel: "",
    models: [],
  },
]

export function AISettingsPage() {
  const [providerType, setProviderType] = React.useState<string>("openai")
  const [baseUrl, setBaseUrl] = React.useState<string>("https://api.openai.com/v1")
  const [apiKey, setApiKey] = React.useState<string>("")
  const [modelId, setModelId] = React.useState<string>("gpt-4o")
  const [temperature, setTemperature] = React.useState<number>(0.2)
  const [showKey, setShowKey] = React.useState<boolean>(false)
  const [hasExistingKey, setHasExistingKey] = React.useState<boolean>(false)

  const [loading, setLoading] = React.useState<boolean>(true)
  const [testing, setTesting] = React.useState<boolean>(false)
  const [saving, setSaving] = React.useState<boolean>(false)
  const [testResult, setTestResult] = React.useState<TestResult | null>(null)

  const loadSettings = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/ai/settings", {
        credentials: "include",
        headers: { Accept: "application/json" },
      })
      if (res.ok) {
        const data: AISettings = await res.json()
        if (data.providerType) setProviderType(data.providerType)
        if (data.baseUrl) setBaseUrl(data.baseUrl)
        if (data.modelId) setModelId(data.modelId)
        if (data.apiKey) setApiKey(data.apiKey)
        if (data.temperature) setTemperature(data.temperature)
        setHasExistingKey(Boolean(data.hasApiKey || data.apiKey))
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadSettings()
  }, [loadSettings])

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
    try {
      const res = await fetch("/api/ai/settings/test", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType,
          baseUrl,
          apiKey,
          modelId,
        }),
      })
      const data = await res.json()
      setTestResult(data)
      if (data.success) {
        notify.success(`Kết nối thành công tới ${data.modelId} (${data.latencyMs}ms)`)
      } else {
        notify.error("Kiểm tra kết nối thất bại", data.error || "Không thể kết nối")
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Lỗi mạng"
      setTestResult({ success: false, error: errMsg })
      notify.error("Lỗi kiểm tra kết nối", errMsg)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/ai/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType,
          baseUrl,
          apiKey,
          modelId,
          temperature,
          isActive: true,
        }),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      notify.success("Cấu hình AI đã được lưu và kích hoạt tức thì")
      setHasExistingKey(true)
      await loadSettings()
    } catch (err) {
      notify.error("Lưu cấu hình thất bại", err instanceof Error ? err.message : "Lỗi server")
    } finally {
      setSaving(false)
    }
  }

  const selectedPreset = PRESETS.find((p) => p.id === providerType)

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Cấu hình Trợ lý AI & Model Provider (BYOK)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Thiết lập mô hình ngôn ngữ lớn (LLM), API Token và các chính sách bảo mật cho toàn bộ Tenant.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSettings} disabled={loading}>
          <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Card */}
        <Card className="lg:col-span-2 shadow-xs border-muted/80">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Bot className="size-4 text-primary" />
              Thông số Nhà cung cấp (AI Provider)
            </CardTitle>
            <CardDescription className="text-xs">
              Mã hóa lưu trữ bảo mật bằng tiêu chuẩn AES-256-GCM kết hợp HKDF-SHA256 (RFC 5869).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preset Picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nhà cung cấp phổ biến</Label>
              <Select value={providerType} onValueChange={handleSelectPreset}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Chọn nhà cung cấp" />
                </SelectTrigger>
                <SelectContent>
                  {PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id} className="text-xs">
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Base URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Globe className="size-3.5 text-muted-foreground" />
                Base URL (OpenAI-compatible)
              </Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="font-mono text-xs h-9"
              />
            </div>

            {/* Model ID */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Cpu className="size-3.5 text-muted-foreground" />
                Model ID
              </Label>
              <div className="flex gap-2">
                <Input
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="gpt-4o"
                  className="font-mono text-xs h-9 flex-1"
                />
              </div>
              {selectedPreset && selectedPreset.models.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground self-center">Gợi ý:</span>
                  {selectedPreset.models.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModelId(m)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        modelId === m
                          ? "bg-primary text-primary-foreground border-primary font-medium"
                          : "bg-muted/40 hover:bg-accent text-foreground border-border"
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
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <Key className="size-3.5 text-muted-foreground" />
                  API Key
                </Label>
                {hasExistingKey && (
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                    <ShieldCheck className="size-3 mr-1" />
                    Đã cấu hình
                  </Badge>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasExistingKey ? "•••••••••••••••••••• (giữ nguyên hoặc nhập mới)" : "sk-..."}
                  className="font-mono text-xs h-9 pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                >
                  {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                </button>
              </div>
            </div>

            {/* Test Result Display */}
            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                  testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-destructive/10 border-destructive/30 text-destructive"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <Shield className="size-4 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold flex items-center gap-2">
                    {testResult.success ? "Kết nối thành công" : "Kết nối thất bại"}
                    {testResult.latencyMs !== undefined && (
                      <Badge variant="outline" className="text-[10px] h-4.5 px-1.5">
                        {testResult.latencyMs}ms
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] mt-0.5 opacity-90">
                    {testResult.message || testResult.error}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing || !baseUrl || !modelId}
              className="text-xs h-8 gap-1.5"
            >
              <Zap className={`size-3.5 ${testing ? "animate-pulse" : ""}`} />
              {testing ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving || !baseUrl || !modelId}
              className="text-xs h-8 gap-1.5"
            >
              {saving ? "Đang lưu..." : "Lưu cấu hình"}
            </Button>
          </CardFooter>
        </Card>

        {/* Security & System Info Sidebars */}
        <div className="space-y-6">
          {/* Security Summary Card */}
          <Card className="shadow-xs border-muted/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lock className="size-4 text-emerald-600" />
                An ninh & Mã hóa (Security)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Chuẩn mã hóa:</span>
                <span className="font-mono font-medium">AES-256-GCM</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Dẫn xuất khóa:</span>
                <span className="font-mono font-medium">HKDF-SHA256</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Chống SSRF Egress:</span>
                <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10">
                  Kích hoạt
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Quyền quản trị:</span>
                <span className="font-mono text-[11px] text-primary">ai.admin</span>
              </div>
            </CardContent>
          </Card>

          {/* Sandbox & Code Mode Invariants */}
          <Card className="shadow-xs border-muted/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                Chính sách Sandbox (Code Mode)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Max Steps:</span>
                <span className="font-mono font-medium">10 turns</span>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-muted-foreground">Timeout JS:</span>
                <span className="font-mono font-medium">3,000 ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Call Budget:</span>
                <span className="font-mono font-medium">50 calls/turn</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
