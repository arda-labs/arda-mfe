import { useEffect, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { api, type ApiSuccess } from "@workspace/api"
import { translateApiError, useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { Label } from "@workspace/ui/components/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import { cn } from "@workspace/ui/lib/utils"

type ProfilePreferences = {
  timezone: string
  locale: string
}

type ProfileMe = {
  displayName?: string
  nickname?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  birthdate?: string
  gender?: string
  address?: string
  country?: string
  department?: string
  employeeId?: string
  approvalLevel?: string
  dailyLimit?: string
  bio?: string
  timezone?: string
  locale?: string
}

const DEFAULT_PREFERENCES: ProfilePreferences = {
  timezone: "Asia/Ho_Chi_Minh",
  locale: "vi-VN",
}

const LOCALE_OPTIONS = [
  { value: "vi-VN", label: "Tiếng Việt (vi-VN)" },
  { value: "en-US", label: "English (en-US)" },
]

// Full IANA list from the runtime, with a small fallback for older engines.
const TIMEZONE_OPTIONS: string[] = (() => {
  try {
    const supported = (
      Intl as unknown as {
        supportedValuesOf?: (key: string) => string[]
      }
    ).supportedValuesOf?.("timeZone")
    if (supported?.length) return supported
  } catch {
    // fall through to the curated list
  }
  return [
    "Asia/Ho_Chi_Minh",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Europe/London",
    "Europe/Berlin",
    "America/New_York",
    "UTC",
  ]
})()

// The profile UPDATE writes every column it touches, so the card fetches the
// full profile first and resubmits those values unchanged — only
// timezone/locale are editable here.
export function PreferencesCard() {
  const { t } = useI18n()
  const [profileMe, setProfileMe] = useState<ProfileMe | null>(null)
  const [prefs, setPrefs] = useState<ProfilePreferences>(DEFAULT_PREFERENCES)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api
      .get<ApiSuccess<ProfileMe>>("/api/iam/me")
      .then((response) => {
        if (cancelled) return
        setProfileMe(response.result)
        setPrefs({
          timezone: response.result.timezone || DEFAULT_PREFERENCES.timezone,
          locale: response.result.locale || DEFAULT_PREFERENCES.locale,
        })
        setPrefsLoaded(true)
      })
      .catch(() => {
        if (!cancelled) {
          setPrefsLoaded(true)
          setError(t("profile.prefs.load_failed"))
        }
      })
    return () => {
      cancelled = true
    }
  }, [t])

  const handleSave = async () => {
    setSavingPrefs(true)
    setError(null)
    setMessage(null)
    try {
      await api.put("/api/iam/me/profile", {
        name: profileMe?.displayName ?? "",
        nickname: profileMe?.nickname ?? "",
        first_name: profileMe?.firstName ?? "",
        last_name: profileMe?.lastName ?? "",
        phone_number: profileMe?.phoneNumber ?? "",
        birthdate: profileMe?.birthdate ?? "",
        gender: profileMe?.gender ?? "",
        address: profileMe?.address ?? "",
        country: profileMe?.country ?? "",
        headline: "",
        department: profileMe?.department ?? "",
        employee_id: profileMe?.employeeId ?? "",
        approval_level: profileMe?.approvalLevel ?? "",
        daily_limit: profileMe?.dailyLimit ?? "",
        bio: profileMe?.bio ?? "",
        timezone: prefs.timezone,
        locale: prefs.locale,
      })
      setMessage(t("profile.prefs.saved"))
    } catch (err) {
      setError(translateApiError(err, "profile.prefs.save_failed"))
    } finally {
      setSavingPrefs(false)
    }
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <h3 className="text-sm font-semibold">{t("profile.prefs.title")}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {t("profile.prefs.description")}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <Label
            htmlFor="prefs-timezone"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("profile.prefs.field_timezone")}
          </Label>
          <div className="mt-1.5">
            <TimezoneSelect
              value={prefs.timezone}
              placeholder={t("profile.prefs.timezone_search")}
              emptyText={t("profile.prefs.timezone_empty")}
              onChange={(timezone) =>
                setPrefs((prev) => ({ ...prev, timezone }))
              }
            />
          </div>
        </div>
        <div className="min-w-0">
          <Label
            htmlFor="prefs-locale"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("profile.prefs.field_locale")}
          </Label>
          <div className="mt-1.5">
            <Select
              value={prefs.locale}
              onValueChange={(locale) =>
                setPrefs((prev) => ({ ...prev, locale }))
              }
            >
              <SelectTrigger id="prefs-locale" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={savingPrefs || !prefsLoaded || !profileMe}
        >
          {savingPrefs ? <Spinner className="mr-2 size-4" /> : null}
          {savingPrefs ? t("profile.prefs.saving") : t("profile.prefs.save")}
        </Button>
        {message && (
          <span className="text-xs text-emerald-700 dark:text-emerald-300">
            {message}
          </span>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </div>
  )
}

function TimezoneSelect({
  value,
  placeholder,
  emptyText,
  onChange,
}: {
  value: string
  placeholder: string
  emptyText: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id="prefs-timezone"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{value || "—"}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {TIMEZONE_OPTIONS.map((tz) => (
                <CommandItem
                  key={tz}
                  value={tz}
                  onSelect={() => {
                    onChange(tz)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "size-4",
                      tz === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {tz}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
