import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { deleteWorkingHour, listWorkingHours, upsertWorkingHour, type WorkingHour } from "../api"

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

/** Working hours (ca làm việc) — weekly shift editor (W6a). */
export function WorkingHoursPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<WorkingHour[]>([])
  const [loading, setLoading] = useState(true)
  const [orgCode, setOrgCode] = useState("")
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [startTime, setStartTime] = useState("08:00")
  const [endTime, setEndTime] = useState("17:00")
  const [breakMinutes, setBreakMinutes] = useState("60")
  const [pending, setPending] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const result = await listWorkingHours(orgCode)
      setItems(result.items)
    } catch {
      setItems([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [orgCode])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    setPending(true)
    try {
      await upsertWorkingHour({
        org_code: orgCode || undefined,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        break_minutes: Number(breakMinutes) || 0,
        is_active: true,
      })
      notify.success(t("platform.working_hours.save_success"))
      await load()
    } catch {
      notify.error(t("platform.working_hours.save_failed"))
    } finally {
      setPending(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteWorkingHour(id)
      await load()
    } catch {
      notify.error(t("platform.working_hours.save_failed"))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("platform.working_hours.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("platform.working_hours.description")}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <Label>{t("platform.working_hours.field.org")}</Label>
          <Input
            value={orgCode}
            className="font-mono"
            onChange={(e) => setOrgCode(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.working_hours.field.day")}</Label>
          <select
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
          >
            {DAY_KEYS.map((key, index) => (
              <option key={key} value={index + 1}>
                {t(`platform.working_hours.day.${key}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.working_hours.field.start")}</Label>
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.working_hours.field.end")}</Label>
          <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("platform.working_hours.field.break")}</Label>
          <Input
            inputMode="numeric"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(e.target.value)}
          />
        </div>
        <Button onClick={() => void save()} disabled={pending}>
          {t("common.action.save")}
        </Button>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t("platform.working_hours.load_failed")}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("platform.working_hours.field.day")}</th>
              <th className="px-3 py-2">{t("platform.working_hours.field.org")}</th>
              <th className="px-3 py-2">{t("platform.working_hours.field.start")}</th>
              <th className="px-3 py-2">{t("platform.working_hours.field.end")}</th>
              <th className="px-3 py-2">{t("platform.working_hours.field.break")}</th>
              <th className="px-3 py-2">{t("common.field.status")}</th>
              <th className="px-3 py-2 text-right">{t("common.field.action")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                  {t("platform.working_hours.loading")}
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                  {t("platform.working_hours.empty")}
                </td>
              </tr>
            )}
            {items.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-3 py-2">
                  {t(`platform.working_hours.day.${DAY_KEYS[row.day_of_week - 1] ?? "mon"}`)}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.org_code || "—"}</td>
                <td className="px-3 py-2">{row.start_time}</td>
                <td className="px-3 py-2">{row.end_time}</td>
                <td className="px-3 py-2 tabular-nums">{row.break_minutes}</td>
                <td className="px-3 py-2">
                  <Badge variant={row.is_active ? "default" : "outline"}>
                    {row.is_active
                      ? t("platform.working_hours.active")
                      : t("platform.working_hours.inactive")}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary hover:underline"
                    onClick={() => void remove(row.id)}
                  >
                    {t("common.action.disable")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
