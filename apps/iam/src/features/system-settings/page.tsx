import { useCallback, useEffect, useMemo, useState } from "react"
import {
  cacheBranding,
  defaultBranding,
  isSafeBrandImageUrl,
} from "@workspace/theme/branding"
import { api, type ApiSuccess } from "@workspace/api"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"

type Parameter = {
  id: string
  key: string
  value: string
  value_type: "string" | "number" | "boolean" | "json" | "date"
  scope_type: "global" | "tenant" | "org" | "branch" | "department"
  description?: string
  is_secret: boolean
}
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
import { PageTitle } from "@workspace/ui/components/page-title"
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
  const { t } = useI18n()
  const [settings, setSettings] = useState<SystemSettings>(defaults)
  const [parameters, setParameters] = useState<Parameter[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadParameters = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get<ApiSuccess<Parameter[]>>(
        "/api/platform/parameters"
      )
      const data = response.result
      setParameters(data)
      setSettings(readSettingsFromList(data))
    } catch {
      notify.error(t("iam.system_settings.load_failed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadParameters()
  }, [loadParameters])

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

  async function saveSettings() {
    const validationError = validateSettings(settings, t)
    if (validationError) {
      notify.error(validationError)
      return
    }

    const parametersByKey = Object.fromEntries(
      parameters.map((param) => [param.key, param])
    ) as Record<string, Parameter>

    setSaving(true)
    try {
      await api.post<ApiSuccess<Parameter>>("/api/platform/parameters", {
        id: parametersByKey[SYSTEM_SETTINGS_KEY]?.id,
        key: SYSTEM_SETTINGS_KEY,
        value: JSON.stringify(settings),
        value_type: "json",
        scope_type: "global",
        description: "System display and authentication settings",
        is_secret: false,
      })
      cacheBranding(settings)
      notify.success(t("iam.system_settings.save_success"))
      await loadParameters()
    } catch {
      notify.error(t("iam.system_settings.save_failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="space-y-4 p-4 pb-3">
          <PageTitle
            title={t("iam.system_settings.title")}
            description={t("iam.system_settings.description")}
            meta={
              <Badge variant="secondary">
                {t("iam.system_settings.badge.global")}
              </Badge>
            }
          />
        </div>

        <Tabs defaultValue="display" className="flex flex-col">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background px-4 py-2">
            <TabsList className="grid h-auto min-w-0 flex-1 grid-cols-3 md:w-fit md:flex-none">
              <TabsTrigger value="display" className="gap-2">
                <Settings2 className="size-4" />
                {t("iam.system_settings.tab.display")}
              </TabsTrigger>
              <TabsTrigger value="password" className="gap-2">
                <KeyRound className="size-4" />
                {t("iam.system_settings.tab.password")}
              </TabsTrigger>
              <TabsTrigger value="login" className="gap-2">
                <MonitorSmartphone className="size-4" />
                {t("iam.system_settings.tab.login")}
              </TabsTrigger>
            </TabsList>
            <Button
              onClick={saveSettings}
              disabled={loading || saving}
              className="shrink-0 gap-2"
            >
              <Save className="size-4" />
              {saving
                ? t("iam.system_settings.actions.saving")
                : t("iam.system_settings.actions.save")}
            </Button>
          </div>

          <div className="space-y-4 p-4">
            <TabsContent value="display" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("iam.system_settings.display.branding_title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput
                      label={t("iam.system_settings.display.app_name")}
                      value={settings.appName}
                      onChange={(appName) =>
                        setSettings((s) => ({ ...s, appName }))
                      }
                    />
                    <TextInput
                      label={t("iam.system_settings.display.short_name")}
                      value={settings.shortName}
                      onChange={(shortName) =>
                        setSettings((s) => ({ ...s, shortName }))
                      }
                    />
                    <TextInput
                      label={t("iam.system_settings.display.organization")}
                      value={settings.organizationName}
                      onChange={(organizationName) =>
                        setSettings((s) => ({ ...s, organizationName }))
                      }
                    />
                    <TextInput
                      label={t("iam.system_settings.display.support_email")}
                      value={settings.supportEmail}
                      onChange={(supportEmail) =>
                        setSettings((s) => ({ ...s, supportEmail }))
                      }
                    />
                    <TextInput
                      label={t("iam.system_settings.display.support_phone")}
                      value={settings.supportPhone}
                      onChange={(supportPhone) =>
                        setSettings((s) => ({ ...s, supportPhone }))
                      }
                    />
                    <TextInput
                      label={t("iam.system_settings.display.help_url")}
                      value={settings.helpUrl}
                      onChange={(helpUrl) =>
                        setSettings((s) => ({ ...s, helpUrl }))
                      }
                    />
                    <TextInput
                      label={t("iam.system_settings.display.login_logo_url")}
                      value={settings.loginLogoUrl}
                      onChange={(loginLogoUrl) =>
                        setSettings((s) => ({ ...s, loginLogoUrl }))
                      }
                    />
                    <TextInput
                      label={t(
                        "iam.system_settings.display.dashboard_logo_url"
                      )}
                      value={settings.dashboardLogoUrl}
                      onChange={(dashboardLogoUrl) =>
                        setSettings((s) => ({ ...s, dashboardLogoUrl }))
                      }
                    />
                    <TextInput
                      label={t("iam.system_settings.display.favicon_url")}
                      value={settings.faviconUrl}
                      onChange={(faviconUrl) =>
                        setSettings((s) => ({ ...s, faviconUrl }))
                      }
                    />
                    <TextInput
                      label={t(
                        "iam.system_settings.display.login_background_url"
                      )}
                      value={settings.loginBackgroundUrl}
                      onChange={(loginBackgroundUrl) =>
                        setSettings((s) => ({ ...s, loginBackgroundUrl }))
                      }
                    />
                    <TextInput
                      label={t("iam.system_settings.display.login_title")}
                      value={settings.loginWelcomeTitle}
                      onChange={(loginWelcomeTitle) =>
                        setSettings((s) => ({ ...s, loginWelcomeTitle }))
                      }
                    />
                    <TextInput
                      label={t("iam.system_settings.display.login_subtitle")}
                      value={settings.loginWelcomeSubtitle}
                      onChange={(loginWelcomeSubtitle) =>
                        setSettings((s) => ({ ...s, loginWelcomeSubtitle }))
                      }
                    />
                    <SettingSwitch
                      className="md:col-span-2"
                      label={t("iam.system_settings.display.login_background")}
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
                    <CardTitle className="text-base">
                      {t("iam.system_settings.password.rules_title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <NumberInput
                      label={t("iam.system_settings.password.min_length")}
                      min={8}
                      value={settings.minPasswordLength}
                      onChange={(minPasswordLength) =>
                        setSettings((s) => ({ ...s, minPasswordLength }))
                      }
                    />
                    <SettingSwitch
                      label={t("iam.system_settings.password.block_pwned")}
                      checked={settings.blockPwnedPassword}
                      onCheckedChange={(blockPwnedPassword) =>
                        setSettings((s) => ({ ...s, blockPwnedPassword }))
                      }
                      source="Kratos"
                    />
                    <SettingSwitch
                      label={t(
                        "iam.system_settings.password.block_similarity"
                      )}
                      checked={settings.blockIdentifierSimilarity}
                      onCheckedChange={(blockIdentifierSimilarity) =>
                        setSettings((s) => ({
                          ...s,
                          blockIdentifierSimilarity,
                        }))
                      }
                      source="Kratos"
                    />
                    <SettingSwitch
                      label={t("iam.system_settings.password.require_uppercase")}
                      checked={settings.requireUppercase}
                      onCheckedChange={(requireUppercase) =>
                        setSettings((s) => ({ ...s, requireUppercase }))
                      }
                      source="Arda"
                    />
                    <SettingSwitch
                      label={t("iam.system_settings.password.require_number")}
                      checked={settings.requireNumber}
                      onCheckedChange={(requireNumber) =>
                        setSettings((s) => ({ ...s, requireNumber }))
                      }
                      source="Arda"
                    />
                    <SettingSwitch
                      label={t("iam.system_settings.password.require_symbol")}
                      checked={settings.requireSymbol}
                      onCheckedChange={(requireSymbol) =>
                        setSettings((s) => ({ ...s, requireSymbol }))
                      }
                      source="Arda"
                    />
                    <NumberInput
                      label={t("iam.system_settings.password.max_age_days")}
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
                      {t("iam.system_settings.password.summary_title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <SummaryRow
                      label={t("iam.system_settings.summary.length")}
                      value={`${settings.minPasswordLength}+ ${t("iam.system_settings.summary.characters")}`}
                    />
                    <SummaryRow
                      label={t("iam.system_settings.summary.rules_enabled")}
                      value={`${passwordRuleCount}/5`}
                    />
                    <SummaryRow
                      label={t("iam.system_settings.summary.rotation")}
                      value={
                        settings.passwordMaxAgeDays > 0
                          ? `${settings.passwordMaxAgeDays} ${t("iam.system_settings.summary.days")}`
                          : t("iam.system_settings.summary.off")
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
                    {t("iam.system_settings.login_security.title")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <SettingSwitch
                    className="md:col-span-2"
                    label={t("iam.system_settings.login_security.single_device")}
                    checked={settings.loginSingleDevice}
                    onCheckedChange={(loginSingleDevice) =>
                      setSettings((s) => ({ ...s, loginSingleDevice }))
                    }
                    source="Arda"
                  />
                  <NumberInput
                    label={t(
                      "iam.system_settings.login_security.max_failed_attempts"
                    )}
                    min={1}
                    value={settings.maxFailedAttempts}
                    onChange={(maxFailedAttempts) =>
                      setSettings((s) => ({ ...s, maxFailedAttempts }))
                    }
                  />
                  <NumberInput
                    label={t("iam.system_settings.login_security.lockout_minutes")}
                    min={1}
                    value={settings.lockoutMinutes}
                    onChange={(lockoutMinutes) =>
                      setSettings((s) => ({ ...s, lockoutMinutes }))
                    }
                  />
                  <NumberInput
                    label={t("iam.system_settings.login_security.attempt_window")}
                    min={1}
                    value={settings.attemptWindowMinutes}
                    onChange={(attemptWindowMinutes) =>
                      setSettings((s) => ({ ...s, attemptWindowMinutes }))
                    }
                  />
                  <NumberInput
                    label={t("iam.system_settings.login_security.session_hours")}
                    min={1}
                    value={settings.sessionLifespanHours}
                    onChange={(sessionLifespanHours) =>
                      setSettings((s) => ({ ...s, sessionLifespanHours }))
                    }
                  />
                  <NumberInput
                    label={t("iam.system_settings.login_security.recent_auth")}
                    min={1}
                    value={settings.privilegedSessionMaxAgeMinutes}
                    onChange={(privilegedSessionMaxAgeMinutes) =>
                      setSettings((s) => ({
                        ...s,
                        privilegedSessionMaxAgeMinutes,
                      }))
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </section>
  )
}

function BrandingPreview({ settings }: { settings: SystemSettings }) {
  const { t } = useI18n()
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
        <p className="mt-1 text-xs text-pretty opacity-80">
          {settings.loginWelcomeSubtitle}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("iam.system_settings.preview.url_hint")}
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

function readSettingsFromList(list: Parameter[]): SystemSettings {
  const parametersByKey = Object.fromEntries(
    list.map((param) => [param.key, param])
  ) as Record<string, Parameter>
  return readSettings(parametersByKey)
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

function validateSettings(
  settings: SystemSettings,
  t: (key: string, params?: Record<string, string | number>) => string
) {
  if (!settings.appName.trim())
    return t("iam.system_settings.validation.app_name_required")
  if (
    settings.supportEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.supportEmail)
  )
    return t("iam.system_settings.validation.support_email_invalid")
  if (settings.helpUrl) {
    try {
      new URL(settings.helpUrl)
    } catch {
      return t("iam.system_settings.validation.help_url_invalid")
    }
  }
  const urlFields: Array<[string, string]> = [
    ["iam.system_settings.display.login_logo_url", settings.loginLogoUrl],
    ["iam.system_settings.display.dashboard_logo_url", settings.dashboardLogoUrl],
    ["iam.system_settings.display.favicon_url", settings.faviconUrl],
    [
      "iam.system_settings.display.login_background_url",
      settings.loginBackgroundUrl,
    ],
  ]
  for (const [labelKey, value] of urlFields) {
    if (!isSafeBrandImageUrl(value)) {
      return t("iam.system_settings.validation.url_not_allowed", {
        field: t(labelKey),
      })
    }
  }
  return ""
}
