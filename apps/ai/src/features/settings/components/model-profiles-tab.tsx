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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  BookmarkPlus,
  Bot,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe,
  Key,
  Lock,
  Power,
  RefreshCw,
  Trash2,
  Zap,
} from "lucide-react"

import {
  activateProfile,
  createProfile,
  deleteProfile,
  fetchAISettings,
  listProfiles,
  saveAISettings,
  testAIConnection,
  type ProfileDTO,
  type TestConnectionResult,
} from "../api"

import { PRESETS } from "../presets"

export function ModelProfilesTab() {
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
  const [testResult, setTestResult] = React.useState<TestConnectionResult | null>(null)

  // Saved profiles state
  const [profiles, setProfiles] = React.useState<ProfileDTO[]>([])
  const [profilesLoading, setProfilesLoading] = React.useState<boolean>(false)
  const [saveProfileOpen, setSaveProfileOpen] = React.useState<boolean>(false)
  const [profileName, setProfileName] = React.useState<string>("")

  const loadProfilesList = React.useCallback(async () => {
    setProfilesLoading(true)
    try {
      const data = await listProfiles()
      setProfiles(data || [])
    } catch {
      // ignore
    } finally {
      setProfilesLoading(false)
    }
  }, [])

  React.useEffect(() => {
    Promise.all([
      fetchAISettings().then((data) => {
        setProviderType(data.providerType || "openai")
        setBaseUrl(data.baseUrl || "")
        setModelId(data.modelId || "")
        setTemperature(data.temperature ?? 0.2)
        setHasExistingKey(Boolean(data.hasApiKey))
      }),
      loadProfilesList(),
    ])
      .catch((err) => {
        notify.error("Không thể tải cấu hình AI", err instanceof Error ? err.message : String(err))
      })
      .finally(() => setLoading(false))
  }, [loadProfilesList])

  const applyPreset = (id: string) => {
    const p = PRESETS.find((item) => item.id === id)
    if (!p) return
    setProviderType(p.id)
    setBaseUrl(p.baseUrl)
    setModelId(p.defaultModel)
    setTemperature(0.2)
    setTestResult(null)
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await testAIConnection({
        providerType,
        baseUrl,
        apiKey: apiKey || "",
        modelId,
      })
      setTestResult(res)
      if (res.success) {
        notify.success("Kiểm tra kết nối thành công!")
      } else {
        notify.error("Kết nối thất bại: " + (res.error || "Unknown error"))
      }
    } catch (err) {
      notify.error("Lỗi khi test kết nối", err instanceof Error ? err.message : String(err))
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await saveAISettings({
        providerType,
        baseUrl,
        apiKey: apiKey || undefined,
        modelId,
        temperature,
      })
      if (apiKey) {
        setHasExistingKey(true)
        setApiKey("")
      }
      notify.success("Cấu hình AI đã được lưu thành công!")
      loadProfilesList()
    } catch (err) {
      notify.error("Lưu cấu hình thất bại", err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNewProfile = async () => {
    if (!profileName.trim()) return
    try {
      await createProfile({
        name: profileName.trim(),
        providerType,
        baseUrl,
        apiKey: apiKey || "existing",
        modelId,
        temperature,
      })
      notify.success(`Đã lưu profile "${profileName}" thành công!`)
      setSaveProfileOpen(false)
      setProfileName("")
      loadProfilesList()
    } catch (err) {
      notify.error("Không thể lưu profile", err instanceof Error ? err.message : String(err))
    }
  }

  const handleActivateProfile = async (id: string, name: string) => {
    try {
      await activateProfile(id)
      notify.success(`Đã kích hoạt profile "${name}"!`)
      // Refresh current active settings
      const updated = await fetchAISettings()
      setProviderType(updated.providerType || "openai")
      setBaseUrl(updated.baseUrl || "")
      setModelId(updated.modelId || "")
      setTemperature(updated.temperature ?? 0.2)
      setHasExistingKey(Boolean(updated.hasApiKey))
      loadProfilesList()
    } catch (err) {
      notify.error("Kích hoạt profile thất bại", err instanceof Error ? err.message : String(err))
    }
  }

  const handleDeleteProfile = async (id: string, name: string) => {
    try {
      await deleteProfile(id)
      notify.success(`Đã xóa profile "${name}"`)
      loadProfilesList()
    } catch (err) {
      notify.error("Xóa profile thất bại", err instanceof Error ? err.message : String(err))
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card className="shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Cấu hình Mô hình Đang Sử Dụng (Active Model)</CardTitle>
                  <CardDescription className="text-xs">
                    Mô hình và thông số đang trực tiếp xử lý các yêu cầu AI trong hệ điều hành Arda.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => setSaveProfileOpen(true)}
                >
                  <BookmarkPlus className="h-3.5 w-3.5 text-primary" />
                  Lưu thành Profile mới
                </Button>
              </div>
            </CardHeader>
            <form onSubmit={handleSave}>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nhà cung cấp (Provider)</Label>
                    <Select value={providerType} onValueChange={setProviderType}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Chọn nhà cung cấp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI (Official)</SelectItem>
                        <SelectItem value="gemini">Google Gemini</SelectItem>
                        <SelectItem value="deepseek">DeepSeek AI</SelectItem>
                        <SelectItem value="ollama">Ollama (Local On-Prem)</SelectItem>
                        <SelectItem value="custom">Custom OpenAI-Compatible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Model ID</Label>
                    <div className="relative">
                      <Bot className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        className="h-8 pl-8 font-mono text-xs"
                        value={modelId}
                        onChange={(e) => setModelId(e.target.value)}
                        placeholder="vd: gpt-4o, gemini-2.5-flash"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Base URL</Label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      className="h-8 pl-8 font-mono text-xs"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">API Key</Label>
                    {hasExistingKey && !apiKey && (
                      <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600">
                        <Lock className="h-3 w-3" /> Đã lưu khóa bảo mật
                      </Badge>
                    )}
                  </div>
                  <div className="relative">
                    <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type={showKey ? "text" : "password"}
                      className="h-8 pl-8 pr-8 font-mono text-xs"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={hasExistingKey ? "Nhập nếu muốn đổi khóa mới..." : "sk-..."}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Độ sáng tạo (Temperature)</Label>
                    <span className="font-mono text-xs font-semibold text-primary">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    className="w-full"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  />
                </div>

                {testResult && (
                  <div className={`rounded-lg border p-3 text-xs ${testResult.success ? "border-emerald-500/30 bg-emerald-500/10" : "border-destructive/30 bg-destructive/10"}`}>
                    <div className="flex items-center gap-2 font-medium">
                      {testResult.success ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="text-emerald-700">Kết nối thành công! (Độ trễ: {testResult.latencyMs ?? 0}ms)</span>
                        </>
                      ) : (
                        <span className="text-destructive font-semibold">Lỗi: {testResult.error || testResult.message}</span>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t pt-4">
                <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${testing ? "animate-spin" : ""}`} />
                  Kiểm tra kết nối
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu thay đổi"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" /> Cấu hình mẫu (Presets)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <Button
                variant="outline"
                size="sm"
                className="h-auto w-full flex-col items-start p-2.5 text-left"
                onClick={() => applyPreset("openai")}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">OpenAI GPT-4o</span>
                  <Badge variant="secondary" className="text-[10px]">Cloud Standard</Badge>
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground">Mô hình đa nhiệm chuẩn mực của OpenAI</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-auto w-full flex-col items-start p-2.5 text-left"
                onClick={() => applyPreset("ollama")}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">Ollama Local (Cluster LAN)</span>
                  <Badge variant="outline" className="text-[10px]">On-Premise</Badge>
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground">Kết nối tới endpoint Ollama do quản trị viên cấu hình</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-auto w-full flex-col items-start p-2.5 text-left"
                onClick={() => applyPreset("openrouter")}
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">OpenRouter Aggregator</span>
                  <Badge variant="secondary" className="text-[10px]">Multi-Model</Badge>
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground">Cổng tổng hợp Claude 3.5, Gemini, Llama 3 qua 1 key duy nhất</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Saved Profiles List */}
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Danh sách Cấu hình đã lưu (Saved Profiles)</CardTitle>
              <CardDescription className="text-xs">
                Chuyển đổi tức thời giữa các nhà cung cấp LLM mà không cần nhập lại thông tin hay API Key
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={loadProfilesList}
              disabled={profilesLoading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${profilesLoading ? "animate-spin" : ""}`} />
              Làm mới danh sách
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 text-xs">
          {profiles.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-muted-foreground">
              Chưa có profile nào được lưu. Bạn có thể lưu cấu hình hiện tại thành profile để tái sử dụng sau.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profiles.map((p) => (
                <div
                  key={p.id || p.name}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all ${
                    p.isActive
                      ? "border-primary/60 bg-primary/5 ring-1 ring-primary/40"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-foreground text-xs">{p.name}</span>
                      {p.isActive ? (
                        <Badge variant="default" className="gap-1 text-[10px] bg-primary">
                          <Check className="h-3 w-3" /> Đang dùng
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Standby
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-muted-foreground font-mono">
                      <div>Model: <span className="font-semibold text-foreground">{p.modelId}</span></div>
                      <div>Provider: <span className="uppercase">{p.providerType}</span></div>
                      <div>Temp: {p.temperature}</div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end gap-1.5 border-t pt-2.5">
                    {p.id && !p.isActive && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteProfile(p.id!, p.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2.5 text-xs text-primary"
                          onClick={() => handleActivateProfile(p.id!, p.name)}
                        >
                          <Power className="h-3 w-3" />
                          Kích hoạt
                        </Button>
                      </>
                    )}
                    {p.isActive && (
                      <span className="text-[11px] font-medium text-primary flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        Đang làm Model chính
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Save New Profile */}
      <Dialog open={saveProfileOpen} onOpenChange={setSaveProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4 text-primary" />
              Lưu Cấu hình thành Profile mới
            </DialogTitle>
            <DialogDescription>
              Lưu toàn bộ thông tin nhà cung cấp ({providerType}), Model ({modelId}) và API Key hiện tại để chuyển đổi nhanh khi cần.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label className="font-medium">Tên Profile</Label>
              <Input
                className="mt-1 h-8 text-xs"
                placeholder="VD: Production Gemini 2.5 Flash, Local Qwen K3s"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveProfileOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveNewProfile} disabled={!profileName.trim()}>
              Lưu Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
