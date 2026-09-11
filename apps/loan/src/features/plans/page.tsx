import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { formatAmount, formatDateShort, fromMinor, toMinor } from "@workspace/format"
import { loanPlanApi, type LoanPlan } from "../api"

/** Loan plan management catalog (W7). */
export function PlansPage() {
  const { t } = useI18n()
  const [plans, setPlans] = useState<LoanPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [editing, setEditing] = useState<LoanPlan | null>(null)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [target, setTarget] = useState("")
  const [note, setNote] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const result = await loanPlanApi.list()
      setPlans(result.items)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const reset = () => {
    setEditing(null)
    setCode("")
    setName("")
    setFromDate("")
    setToDate("")
    setTarget("")
    setNote("")
  }

  const edit = (plan: LoanPlan) => {
    setEditing(plan)
    setCode(plan.code)
    setName(plan.name)
    setFromDate(plan.from_date ?? "")
    setToDate(plan.to_date ?? "")
    setTarget(String(fromMinor(plan.target_amount_minor, "VND")))
    setNote(plan.note ?? "")
  }

  const save = async () => {
    if (!code.trim() || !name.trim()) {
      notify.error(t("loan.plans.validation.required"))
      return
    }
    try {
      await loanPlanApi.upsert({
        code: code.trim(),
        name: name.trim(),
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        target_amount_minor: toMinor(Number(target) || 0, "VND"),
        note,
        status: "ACTIVE",
      })
      notify.success(t("loan.plans.save_success"))
      reset()
      await load()
    } catch {
      notify.error(t("loan.plans.save_failed"))
    }
  }

  const close = async (id: string) => {
    try {
      await loanPlanApi.close(id)
      await load()
    } catch {
      notify.error(t("loan.plans.save_failed"))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("loan.plans.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("loan.plans.description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>{t("common.field.code")}</Label>
          <Input
            value={code}
            disabled={Boolean(editing)}
            className="font-mono"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("common.field.name")}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("loan.plans.field.from_date")}</Label>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("loan.plans.field.to_date")}</Label>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("loan.plans.field.target")}</Label>
          <Input inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>{t("loan.plans.field.note")}</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={() => void save()}>{t("common.action.save")}</Button>
          {editing && (
            <Button variant="outline" onClick={reset}>
              {t("common.action.cancel")}
            </Button>
          )}
        </div>
      </div>

      {loadFailed && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t("loan.plans.load_failed")}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("common.field.code")}</th>
              <th className="px-3 py-2">{t("common.field.name")}</th>
              <th className="px-3 py-2">{t("loan.plans.field.from_date")}</th>
              <th className="px-3 py-2">{t("loan.plans.field.to_date")}</th>
              <th className="px-3 py-2 text-right">{t("loan.plans.field.target")}</th>
              <th className="px-3 py-2">{t("common.field.status")}</th>
              <th className="px-3 py-2 text-right">{t("common.field.action")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!loading && plans.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                  {t("loan.plans.empty")}
                </td>
              </tr>
            )}
            {plans.map((plan) => (
              <tr key={plan.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">{plan.code}</td>
                <td className="px-3 py-2 font-medium">{plan.name}</td>
                <td className="px-3 py-2">{plan.from_date ? formatDateShort(plan.from_date) : "—"}</td>
                <td className="px-3 py-2">{plan.to_date ? formatDateShort(plan.to_date) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatAmount(fromMinor(plan.target_amount_minor, "VND"), "VND")}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={plan.status === "ACTIVE" ? "default" : "outline"}>
                    {plan.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() => edit(plan)}
                    >
                      {t("common.action.edit")}
                    </button>
                    {plan.status === "ACTIVE" && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-destructive hover:underline"
                        onClick={() => void close(plan.id)}
                      >
                        {t("loan.plans.close")}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
