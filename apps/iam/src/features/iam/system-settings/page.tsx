import { useEffect, useMemo, useState } from "react"
import { api } from "@workspace/api"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import {
  KeyRound,
  LockKeyhole,
  MonitorSmartphone,
  Save,
  Settings2,
} from "lucide-react"

type Parameter = {
  id: string
  key: string
  value: string
  value_type: "string" | "number" | "boolean" | "json" | "date"
  scope_type: "global" | "tenant" | "org" | "branch" | "department"
  description?: string
  is_secret: boolean
}

type SystemSettings = {
  appName: string
  supportEmail: string
  supportPhone: string
  helpUrl: string
  loginSingleDevice: boolean
  maxFailedAttempts: number
  lockoutMinutes: number
  attemptWindowMinutes: number
  sessionLifespanHours: number
  privilegedSessionMaxAgeMinutes: number
  minPasswordLength: number
  blockPwnedPassword: boolean
  blockIdentifierSimilarity: boolean
  requireUppercase: boolean
  requireNumber: boolean
  requireSymbol: boolean
  passwordMaxAgeDays: number
}

const defaults: SystemSettings = {
  appName: "Arda",
  supportEmail: "support@arda.io.vn",
  supportPhone: "",
  helpUrl: "",
  loginSingleDevice: false,
  maxFailedAttempts: 5,
  lockoutMinutes: 15,
  attemptWindowMinutes: 10,
  sessionLifespanHours: 720,
  privilegedSessionMaxAgeMinutes: 15,
  minPasswordLength: 12,
  blockPwnedPassword: true,
  blockIdentifierSimilarity: true,
  requireUppercase: false,
  requireNumber: false,
  requireSymbol: false,
  passwordMaxAgeDays: 0,
}

const fields: Record<
  keyof SystemSettings,
  { key: string; valueType: Parameter["value_type"]; description: string }
> = {
  appName: {
    key: "app.name",
    valueType: "string",
    description: "Public application name",
  },
  supportEmail: {
    key: "app.support_email",
    valueType: "string",
    description: "Login support email",
  },
  supportPhone: {
    key: "app.support_phone",
    valueType: "string",
    description: "Login support phone",
  },
  helpUrl: {
    key: "app.help_url",
    valueType: "string",
    description: "Help center URL",
  },
  loginSingleDevice: {
    key: "auth.login.single_device",
    valueType: "boolean",
    description: "Allow one active BFF session per user",
  },
  maxFailedAttempts: {
    key: "auth.login.max_failed_attempts",
    valueType: "number",
    description: "Failed login limit",
  },
  lockoutMinutes: {
    key: "auth.login.lockout_minutes",
    valueType: "number",
    description: "Login lock duration",
  },
  attemptWindowMinutes: {
    key: "auth.login.attempt_window_minutes",
    valueType: "number",
    description: "Failed login rolling window",
  },
  sessionLifespanHours: {
    key: "auth.session.lifespan_hours",
    valueType: "number",
    description: "Browser session lifespan",
  },
  privilegedSessionMaxAgeMinutes: {
    key: "auth.session.privileged_max_age_minutes",
    valueType: "number",
    description: "Recent-auth window",
  },
  minPasswordLength: {
    key: "auth.password.min_length",
    valueType: "number",
    description: "Minimum password length",
  },
  blockPwnedPassword: {
    key: "auth.password.block_pwned",
    valueType: "boolean",
    description: "Block known leaked passwords",
  },
  blockIdentifierSimilarity: {
    key: "auth.password.block_identifier_similarity",
    valueType: "boolean",
    description: "Block password similar to identifier",
  },
  requireUppercase: {
    key: "auth.password.require_uppercase",
    valueType: "boolean",
    description: "Custom uppercase rule",
  },
  requireNumber: {
    key: "auth.password.require_number",
    valueType: "boolean",
    description: "Custom number rule",
  },
  requireSymbol: {
    key: "auth.password.require_symbol",
    valueType: "boolean",
    description: "Custom symbol rule",
  },
  passwordMaxAgeDays: {
    key: "auth.password.max_age_days",
    valueType: "number",
    description: "Password rotation age; 0 disables rotation",
  },
}

export function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(defaults)
  const [parametersByKey, setParametersByKey] = useState<
    Record<string, Parameter>
  >({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const passwordRuleCount = useMemo(
    () =>
      [
        settings.blockPwnedPassword,
        settings.blockIdentifierSimilarity,
        settings.requireUppercase,
        settings.requireNumber,
        settings.requireSymbol,
      ].filter(Boolean).length,
    [settings]
  )

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)
    try {
      const parameters = await api.get<Parameter[]>("/api/platform/parameters")
      const nextByKey = Object.fromEntries(
        parameters.map((param) => [param.key, param])
      )
      setParametersByKey(nextByKey)
      setSettings(readSettings(nextByKey))
    } catch {
      notify.error("Không thể tải cấu hình hệ thống")
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings() {
    const validationError = validateSettings(settings)
    if (validationError) {
      notify.error(validationError)
      return
    }

    setSaving(true)
    try {
      await Promise.all(
        Object.entries(fields).map(([fieldName, meta]) => {
          const current = parametersByKey[meta.key]
          const value = settings[fieldName as keyof SystemSettings]
          return api.post<Parameter>("/api/platform/parameters", {
            id: current?.id,
            key: meta.key,
            value: serializeValue(value),
            value_type: meta.valueType,
            scope_type: "global",
            description: meta.description,
            is_secret: false,
          })
        })
      )
      notify.success("Đã lưu cấu hình hệ thống")
      await loadSettings()
    } catch {
      notify.error("Lưu cấu hình thất bại")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">
              Cài đặt hệ thống
            </h2>
            <Badge variant="secondary">Toàn cục</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Cấu hình hiển thị login, mật khẩu, phiên đăng nhập và giới hạn bảo
            mật.
          </p>
        </div>
        <Button
          onClick={saveSettings}
          disabled={loading || saving}
          className="gap-2"
        >
          <Save className="size-4" />
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </div>

      <Tabs defaultValue="display" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-3 md:w-fit">
          <TabsTrigger value="display" className="gap-2">
            <Settings2 className="size-4" />
            Hiển thị
          </TabsTrigger>
          <TabsTrigger value="password" className="gap-2">
            <KeyRound className="size-4" />
            Mật khẩu
          </TabsTrigger>
          <TabsTrigger value="login" className="gap-2">
            <MonitorSmartphone className="size-4" />
            Đăng nhập
          </TabsTrigger>
        </TabsList>

        <TabsContent value="display" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Thông tin hiển thị trên login
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="Tên ứng dụng"
                value={settings.appName}
                onChange={(appName) => setSettings((s) => ({ ...s, appName }))}
              />
              <TextInput
                label="Email hỗ trợ"
                value={settings.supportEmail}
                onChange={(supportEmail) =>
                  setSettings((s) => ({ ...s, supportEmail }))
                }
              />
              <TextInput
                label="Số điện thoại hỗ trợ"
                value={settings.supportPhone}
                onChange={(supportPhone) =>
                  setSettings((s) => ({ ...s, supportPhone }))
                }
              />
              <TextInput
                label="Help center URL"
                value={settings.helpUrl}
                onChange={(helpUrl) => setSettings((s) => ({ ...s, helpUrl }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quy định mật khẩu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <NumberInput
                  label="Độ dài tối thiểu"
                  min={8}
                  value={settings.minPasswordLength}
                  onChange={(minPasswordLength) =>
                    setSettings((s) => ({ ...s, minPasswordLength }))
                  }
                />
                <SettingSwitch
                  label="Chặn mật khẩu đã bị lộ"
                  checked={settings.blockPwnedPassword}
                  onCheckedChange={(blockPwnedPassword) =>
                    setSettings((s) => ({ ...s, blockPwnedPassword }))
                  }
                  source="Kratos"
                />
                <SettingSwitch
                  label="Chặn mật khẩu giống email/tên đăng nhập"
                  checked={settings.blockIdentifierSimilarity}
                  onCheckedChange={(blockIdentifierSimilarity) =>
                    setSettings((s) => ({ ...s, blockIdentifierSimilarity }))
                  }
                  source="Kratos"
                />
                <SettingSwitch
                  label="Bắt buộc có chữ hoa"
                  checked={settings.requireUppercase}
                  onCheckedChange={(requireUppercase) =>
                    setSettings((s) => ({ ...s, requireUppercase }))
                  }
                  source="Arda"
                />
                <SettingSwitch
                  label="Bắt buộc có chữ số"
                  checked={settings.requireNumber}
                  onCheckedChange={(requireNumber) =>
                    setSettings((s) => ({ ...s, requireNumber }))
                  }
                  source="Arda"
                />
                <SettingSwitch
                  label="Bắt buộc có ký tự đặc biệt"
                  checked={settings.requireSymbol}
                  onCheckedChange={(requireSymbol) =>
                    setSettings((s) => ({ ...s, requireSymbol }))
                  }
                  source="Arda"
                />
                <NumberInput
                  label="Số ngày phải đổi mật khẩu"
                  min={0}
                  value={settings.passwordMaxAgeDays}
                  onChange={(passwordMaxAgeDays) =>
                    setSettings((s) => ({ ...s, passwordMaxAgeDays }))
                  }
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LockKeyhole className="size-4" />
                  Tóm tắt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <SummaryRow
                  label="Độ dài"
                  value={`${settings.minPasswordLength}+ ký tự`}
                />
                <SummaryRow
                  label="Rule đang bật"
                  value={`${passwordRuleCount}/5`}
                />
                <SummaryRow
                  label="Đổi định kỳ"
                  value={
                    settings.passwordMaxAgeDays > 0
                      ? `${settings.passwordMaxAgeDays} ngày`
                      : "Tắt"
                  }
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="login" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Bảo mật đăng nhập và phiên
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <SettingSwitch
                className="md:col-span-2"
                label="Chỉ cho phép 1 thiết bị đăng nhập"
                checked={settings.loginSingleDevice}
                onCheckedChange={(loginSingleDevice) =>
                  setSettings((s) => ({ ...s, loginSingleDevice }))
                }
                source="Arda"
              />
              <NumberInput
                label="Số lần đăng nhập sai tối đa"
                min={1}
                value={settings.maxFailedAttempts}
                onChange={(maxFailedAttempts) =>
                  setSettings((s) => ({ ...s, maxFailedAttempts }))
                }
              />
              <NumberInput
                label="Khóa đăng nhập trong bao nhiêu phút"
                min={1}
                value={settings.lockoutMinutes}
                onChange={(lockoutMinutes) =>
                  setSettings((s) => ({ ...s, lockoutMinutes }))
                }
              />
              <NumberInput
                label="Cửa sổ đếm lỗi đăng nhập (phút)"
                min={1}
                value={settings.attemptWindowMinutes}
                onChange={(attemptWindowMinutes) =>
                  setSettings((s) => ({ ...s, attemptWindowMinutes }))
                }
              />
              <NumberInput
                label="Thời hạn phiên đăng nhập (giờ)"
                min={1}
                value={settings.sessionLifespanHours}
                onChange={(sessionLifespanHours) =>
                  setSettings((s) => ({ ...s, sessionLifespanHours }))
                }
              />
              <NumberInput
                label="Recent-auth cho thao tác nhạy cảm (phút)"
                min={1}
                value={settings.privilegedSessionMaxAgeMinutes}
                onChange={(privilegedSessionMaxAgeMinutes) =>
                  setSettings((s) => ({ ...s, privilegedSessionMaxAgeMinutes }))
                }
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <FormField label={label}>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </FormField>
  )
}

function NumberInput({
  label,
  min,
  value,
  onChange,
}: {
  label: string
  min: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <FormField label={label}>
      <Input
        type="number"
        min={min}
        value={value}
        onChange={(event) =>
          onChange(Math.max(min, Number(event.target.value) || min))
        }
      />
    </FormField>
  )
}

function SettingSwitch({
  label,
  source,
  checked,
  onCheckedChange,
  className,
}: {
  label: string
  source: "Arda" | "Kratos"
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border p-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Label className="font-medium">{label}</Label>
        <Badge variant="outline">{source}</Badge>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function readSettings(
  parametersByKey: Record<string, Parameter>
): SystemSettings {
  return Object.fromEntries(
    Object.entries(fields).map(([fieldName, meta]) => {
      const fallback = defaults[fieldName as keyof SystemSettings]
      return [fieldName, parseValue(parametersByKey[meta.key]?.value, fallback)]
    })
  ) as SystemSettings
}

function parseValue(
  value: string | undefined,
  fallback: string | number | boolean
) {
  if (value === undefined || value === "") return fallback
  if (typeof fallback === "boolean") return value === "true"
  if (typeof fallback === "number") return Number(value) || fallback
  return value
}

function serializeValue(value: string | number | boolean) {
  return String(value)
}

function validateSettings(settings: SystemSettings) {
  if (!settings.appName.trim()) return "Tên ứng dụng không được để trống"
  if (
    settings.supportEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.supportEmail)
  )
    return "Email hỗ trợ không hợp lệ"
  if (settings.helpUrl) {
    try {
      new URL(settings.helpUrl)
    } catch {
      return "Help center URL không hợp lệ"
    }
  }
  return ""
}
