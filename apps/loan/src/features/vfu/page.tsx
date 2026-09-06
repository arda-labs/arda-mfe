import { useCallback, useEffect, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { PageHeader } from "@workspace/ui/components/page-header"
import { vfuApi, type VfuMandate, type VfuParty, type VfuPlan } from "../api"

type DialogTarget = "party" | "mandate" | "plan" | null

export function VfuPage(_props: { pathname: string }) {
  const { t } = useI18n()
  const [parties, setParties] = useState<VfuParty[]>([])
  const [mandates, setMandates] = useState<VfuMandate[]>([])
  const [plans, setPlans] = useState<VfuPlan[]>([])
  const [dialogTarget, setDialogTarget] = useState<DialogTarget>(null)
  const [savePending, setSavePending] = useState(false)
  const [form, setForm] = useState({ code: "", name: "", extra: "" })

  const loadAll = useCallback(async () => {
    try {
      const [p, m, pl] = await Promise.all([
        vfuApi.listParties(),
        vfuApi.listMandates(),
        vfuApi.listPlans(),
      ])
      setParties(p)
      setMandates(m)
      setPlans(pl)
    } catch (error) {
      notify.error(translateApiError(error, t("loan_vfu.load_failed")))
    } finally {
    }
  }, [t])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const openDialog = (target: Exclude<DialogTarget, null>) => {
    setForm({ code: "", name: "", extra: "" })
    setDialogTarget(target)
  }

  const submitCreate = async () => {
    if (!form.code.trim()) {
      notify.error(t("loan_vfu.validation.code_required"))
      return
    }
    setSavePending(true)
    try {
      if (dialogTarget === "party") {
        await vfuApi.createParty({ party_code: form.code.trim(), party_name: form.name.trim(), party_type: "ORG" })
      } else if (dialogTarget === "mandate") {
        await vfuApi.createMandate({
          mandate_code: form.code.trim(),
          party_code: form.name.trim(),
          rep_name: form.extra.trim() || undefined,
        })
      } else if (dialogTarget === "plan") {
        await vfuApi.createPlan({
          plan_code: form.code.trim(),
          mandate_code: form.name.trim(),
          allocated_amt: form.extra ? Number(form.extra) : 0,
        })
      }
      notify.success(t("loan_vfu.saved"))
      setDialogTarget(null)
      await loadAll()
    } catch (error) {
      notify.error(translateApiError(error, t("loan_vfu.save_failed")))
    } finally {
      setSavePending(false)
    }
  }

  const dialogLabels: Record<Exclude<DialogTarget, null>, { code: string; name: string; extra: string }> = {
    party: { code: t("loan_vfu.field.party_code"), name: t("loan_vfu.field.party_name"), extra: "" },
    mandate: { code: t("loan_vfu.field.mandate_code"), name: t("loan_vfu.field.party_code"), extra: t("loan_vfu.field.rep_name") },
    plan: { code: t("loan_vfu.field.plan_code"), name: t("loan_vfu.field.mandate_code"), extra: t("loan_vfu.field.allocated") },
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("loan_vfu.title")} description={t("loan_vfu.description")} />

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("loan_vfu.parties_title")}</h2>
          <Button size="sm" variant="outline" onClick={() => openDialog("party")}>
            {t("loan_vfu.create_party")}
          </Button>
        </div>
        {parties.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("loan.empty")}</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.party_code")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.party_name")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.phone")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan.field.status")}</th>
                </tr>
              </thead>
              <tbody>
                {parties.map((party) => (
                  <tr key={party.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-[13px]">{party.party_code}</td>
                    <td className="px-3 py-2">{party.party_name}</td>
                    <td className="px-3 py-2">{party.mobile_number || "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={party.status === "ACTIVE" ? "default" : "outline"}>{party.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("loan_vfu.mandates_title")}</h2>
          <Button size="sm" variant="outline" onClick={() => openDialog("mandate")}>
            {t("loan_vfu.create_mandate")}
          </Button>
        </div>
        {mandates.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("loan.empty")}</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.mandate_code")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.party_code")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.rate")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan.field.status")}</th>
                </tr>
              </thead>
              <tbody>
                {mandates.map((mandate) => (
                  <tr key={mandate.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-[13px]">{mandate.mandate_code}</td>
                    <td className="px-3 py-2">{mandate.party_code}</td>
                    <td className="px-3 py-2 tabular-nums">{mandate.rate_value ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={mandate.status === "ACTIVE" ? "default" : "outline"}>{mandate.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t("loan_vfu.plans_title")}</h2>
          <Button size="sm" variant="outline" onClick={() => openDialog("plan")}>
            {t("loan_vfu.create_plan")}
          </Button>
        </div>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("loan.empty")}</p>
        ) : (
          <div className="overflow-hidden rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.plan_code")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.mandate_code")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.allocated")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.settled")}</th>
                  <th className="px-3 py-2 font-medium">{t("loan_vfu.field.fee")}</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-t">
                    <td className="px-3 py-2 font-mono text-[13px]">{plan.plan_code}</td>
                    <td className="px-3 py-2">{plan.mandate_code}</td>
                    <td className="px-3 py-2 tabular-nums">{new Intl.NumberFormat("vi-VN").format(plan.allocated_amt)}</td>
                    <td className="px-3 py-2 tabular-nums">{new Intl.NumberFormat("vi-VN").format(plan.settled_amt)}</td>
                    <td className="px-3 py-2 tabular-nums">{new Intl.NumberFormat("vi-VN").format(plan.fee_amt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={Boolean(dialogTarget)} onOpenChange={(open) => !open && setDialogTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("loan_vfu.create_title")}</DialogTitle>
            <DialogDescription>{t("loan_vfu.dialog_description")}</DialogDescription>
          </DialogHeader>
          {dialogTarget && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="vfu-code">{dialogLabels[dialogTarget].code}</Label>
                <Input
                  id="vfu-code"
                  value={form.code}
                  onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vfu-name">{dialogLabels[dialogTarget].name}</Label>
                <Input
                  id="vfu-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              {dialogLabels[dialogTarget].extra && (
                <div className="space-y-1.5">
                  <Label htmlFor="vfu-extra">{dialogLabels[dialogTarget].extra}</Label>
                  <Input
                    id="vfu-extra"
                    value={form.extra}
                    onChange={(event) => setForm((current) => ({ ...current, extra: event.target.value }))}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTarget(null)}>
              {t("loan_vfu.cancel")}
            </Button>
            <Button onClick={() => void submitCreate()} disabled={savePending}>
              {t("loan_vfu.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
