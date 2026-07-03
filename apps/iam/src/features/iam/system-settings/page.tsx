import { useEffect, useMemo, useState } from "react"
import {
  cacheBranding,
  defaultBranding,
  isSafeBrandImageUrl,
} from "@workspace/core/branding"
import { notify } from "@workspace/notifications/notify"
import {
  type Parameter,
  useSaveSystemSettings,
  useSystemParameters,
} from "@/features/iam/system-settings/queries"
import { Badge } from "@workspace/ui/components/badge"
import { BrandMark } from "@workspace/ui/components/brand-mark"
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

type SystemSettings = {
  appName: string
  shortName: string
  organizationName: string
  supportEmail: string
  supportPhone: string
  helpUrl: string
  loginLogoUrl: string
  dashboardLogoUrl: string
  faviconUrl: string
  loginBackgroundUrl: string
  loginBackgroundEnabled: boolean
  loginWelcomeTitle: string
  loginWelcomeSubtitle: string
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

const SYSTEM_SETTINGS_KEY = "system.settings"

const defaults: SystemSettings = {
  appName: defaultBranding.appName,
  shortName: defaultBranding.shortName,
  organizationName: defaultBranding.organizationName,
  supportEmail: defaultBranding.supportEmail,
  supportPhone: defaultBranding.supportPhone,
  helpUrl: defaultBranding.helpUrl,
  loginLogoUrl: defaultBranding.loginLogoUrl,
  dashboardLogoUrl: defaultBranding.dashboardLogoUrl,
  faviconUrl: defaultBranding.faviconUrl,
  loginBackgroundUrl: defaultBranding.loginBackgroundUrl,
  loginBackgroundEnabled: defaultBranding.loginBackgroundEnabled,
  loginWelcomeTitle: defaultBranding.loginWelcomeTitle,
  loginWelcomeSubtitle: defaultBranding.loginWelcomeSubtitle,
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

const fields: Record<keyof SystemSettings, { key: string }> = {
  appName: {
    key: "app.name",
  },
  shortName: {
    key: "app.short_name",
  },
  organizationName: {
    key: "app.organization_name",
  },
  supportEmail: {
    key: "app.support_email",
  },
  supportPhone: {
    key: "app.support_phone",
  },
  helpUrl: {
    key: "app.help_url",
  },
  loginLogoUrl: {
    key: "app.login_logo_url",
  },
  dashboardLogoUrl: {
    key: "app.dashboard_logo_url",
  },
  faviconUrl: {
    key: "app.favicon_url",
  },
  loginBackgroundUrl: {
    key: "app.login_background_url",
  },
  loginBackgroundEnabled: {
    key: "app.login_background_enabled",
  },
  loginWelcomeTitle: {
    key: "app.login_welcome_title",
  },
  loginWelcomeSubtitle: {
    key: "app.login_welcome_subtitle",
  },
  loginSingleDevice: {
    key: "auth.login.single_device",
  },
  maxFailedAttempts: {
    key: "auth.login.max_failed_attempts",
  },
  lockoutMinutes: {
    key: "auth.login.lockout_minutes",
  },
  attemptWindowMinutes: {
    key: "auth.login.attempt_window_minutes",
  },
  sessionLifespanHours: {
    key: "auth.session.lifespan_hours",
  },
  privilegedSessionMaxAgeMinutes: {
    key: "auth.session.privileged_max_age_minutes",
  },
  minPasswordLength: {
    key: "auth.password.min_length",
  },
  blockPwnedPassword: {
    key: "auth.password.block_pwned",
  },
  blockIdentifierSimilarity: {
    key: "auth.password.block_identifier_similarity",
  },
  requireUppercase: {
    key: "auth.password.require_uppercase",
  },
  requireNumber: {
    key: "auth.password.require_number",
  },
  requireSymbol: {
    key: "auth.password.require_symbol",
  },
  passwordMaxAgeDays: {
    key: "auth.password.max_age_days",
  },
}

export function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(defaults)
  const parametersQuery = useSystemParameters()
  const saveSettingsMutation = useSaveSystemSettings()
  const parametersByKey = useMemo(
    () =>
      Object.fromEntries(
        (parametersQuery.data ?? []).map((param) => [param.key, param])
      ) as Record<string, Parameter>,
    [parametersQuery.data]
  )
  const loading = parametersQuery.isLoading
  const saving = saveSettingsMutation.isPending

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
    if (parametersQuery.data) {
      setSettings(readSettings(parametersByKey))
    }
  }, [parametersByKey, parametersQuery.data])

  useEffect(() => {
    if (parametersQuery.error) {
      notify.error("Không thể tải cấu hình hệ thống")
    }
  }, [parametersQuery.error])

  async function saveSettings() {
    const validationError = validateSettings(settings)
    if (validationError) {
      notify.error(validationError)
      return
    }

    try {
      await saveSettingsMutation.mutateAsync({
        id: parametersByKey[SYSTEM_SETTINGS_KEY]?.id,
        key: SYSTEM_SETTINGS_KEY,
        value: JSON.stringify(settings),
        value_type: "json",
        scope_type: "global",
        description: "System display and authentication settings",
        is_secret: false,
      })
      cacheBranding(settings)
      notify.success("Đã lưu cấu hình hệ thống")
    } catch {
      notify.error("Lưu cấu hình thất bại")
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
                Thương hiệu và hiển thị
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="grid gap-4 md:grid-cols-2">
                <TextInput
                  label="Tên ứng dụng"
                  value={settings.appName}
                  onChange={(appName) => setSettings((s) => ({ ...s, appName }))}
                />
                <TextInput
                  label="Tên rút gọn"
                  value={settings.shortName}
                  onChange={(shortName) =>
                    setSettings((s) => ({ ...s, shortName }))
                  }
                />
                <TextInput
                  label="Tổ chức"
                  value={settings.organizationName}
                  onChange={(organizationName) =>
                    setSettings((s) => ({ ...s, organizationName }))
                  }
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
                <TextInput
                  label="Login logo URL"
                  value={settings.loginLogoUrl}
                  onChange={(loginLogoUrl) =>
                    setSettings((s) => ({ ...s, loginLogoUrl }))
                  }
                />
                <TextInput
                  label="Dashboard logo URL"
                  value={settings.dashboardLogoUrl}
                  onChange={(dashboardLogoUrl) =>
                    setSettings((s) => ({ ...s, dashboardLogoUrl }))
                  }
                />
                <TextInput
                  label="Favicon URL"
                  value={settings.faviconUrl}
                  onChange={(faviconUrl) =>
                    setSettings((s) => ({ ...s, faviconUrl }))
                  }
                />
                <TextInput
                  label="Login background URL"
                  value={settings.loginBackgroundUrl}
                  onChange={(loginBackgroundUrl) =>
                    setSettings((s) => ({ ...s, loginBackgroundUrl }))
                  }
                />
                <TextInput
                  label="Tiêu đề login"
                  value={settings.loginWelcomeTitle}
                  onChange={(loginWelcomeTitle) =>
                    setSettings((s) => ({ ...s, loginWelcomeTitle }))
                  }
                />
                <TextInput
                  label="Mô tả login"
                  value={settings.loginWelcomeSubtitle}
                  onChange={(loginWelcomeSubtitle) =>
                    setSettings((s) => ({ ...s, loginWelcomeSubtitle }))
                  }
                />
                <SettingSwitch
                  className="md:col-span-2"
                  label="Bật ảnh nền login"
                  checked={settings.loginBackgroundEnabled}
                  onCheckedChange={(loginBackgroundEnabled) =>
                    setSettings((s) => ({ ...s, loginBackgroundEnabled }))
                  }
                  source="Arda"
                />
              </div>
              <BrandingPreview settings={settings} />
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

function BrandingPreview({ settings }: { settings: SystemSettings }) {
  const logoUrl = settings.dashboardLogoUrl || settings.loginLogoUrl
  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center gap-3">
        <BrandMark name={settings.appName} logoUrl={logoUrl} size="md" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{settings.appName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {settings.organizationName || "Workspace"}
          </p>
        </div>
      </div>
      <div
        className="flex min-h-36 flex-col justify-end rounded-lg border bg-card p-4 text-sm"
        style={
          settings.loginBackgroundEnabled && settings.loginBackgroundUrl
            ? {
                backgroundImage: `linear-gradient(to top, rgb(0 0 0 / 0.55), rgb(0 0 0 / 0.08)), url(${settings.loginBackgroundUrl})`,
                backgroundPosition: "center",
                backgroundSize: "cover",
                color: "white",
              }
            : undefined
        }
      >
        <p className="font-semibold text-balance">
          {settings.loginWelcomeTitle}
        </p>
        <p className="mt-1 text-xs opacity-80 text-pretty">
          {settings.loginWelcomeSubtitle}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        URL ảnh chỉ chấp nhận đường dẫn nội bộ hoặc HTTPS.
      </p>
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
  const aggregate = parseSettingsJSON(
    parametersByKey[SYSTEM_SETTINGS_KEY]?.value
  )
  if (aggregate) return aggregate

  return Object.fromEntries(
    Object.entries(fields).map(([fieldName, meta]) => {
      const fallback = defaults[fieldName as keyof SystemSettings]
      return [fieldName, parseValue(parametersByKey[meta.key]?.value, fallback)]
    })
  ) as SystemSettings
}

function parseSettingsJSON(value: string | undefined): SystemSettings | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<SystemSettings>
    return { ...defaults, ...parsed }
  } catch {
    return null
  }
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
  const urlFields: Array<[string, string]> = [
    ["Login logo URL", settings.loginLogoUrl],
    ["Dashboard logo URL", settings.dashboardLogoUrl],
    ["Favicon URL", settings.faviconUrl],
    ["Login background URL", settings.loginBackgroundUrl],
  ]
  for (const [label, value] of urlFields) {
    if (!isSafeBrandImageUrl(value)) {
      return `${label} chỉ chấp nhận đường dẫn nội bộ hoặc HTTPS`
    }
  }
  return ""
}
