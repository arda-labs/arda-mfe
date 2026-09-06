import { useCallback, useEffect, useState } from "react"
import { useI18n, translateApiError } from "@workspace/i18n"
import { formatAmount, formatDateShort, formatRatePercent, isValidISODate, parseMoneyInput, todayISO } from "@workspace/format"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { notify } from "@workspace/ui/feedback/notify"
import { Edit2, Plus, Trash2 } from "lucide-react"
import { interestRateApi, type InterestRate, type InterestRateTier } from "../../api"

type TierForm = {
  effective_from: string
  effective_to: string
  amount_from: string
  amount_to: string
  rate_value: string
  min_rate: string
  max_rate: string
  decision_no: string
  decision_date: string
}

const emptyTierForm: TierForm = {
  effective_from: "",
  effective_to: "",
  amount_from: "",
  amount_to: "",
  rate_value: "",
  min_rate: "",
  max_rate: "",
  decision_no: "",
  decision_date: "",
}

function optionalMoney(raw: string): number | undefined {
  if (!raw.trim()) return undefined
  return parseMoneyInput(raw)
}

function optionalRate(raw: string): number | undefined {
  if (!raw.trim()) return undefined
  const value = Number(raw.replace(",", "."))
  return Number.isFinite(value) ? value : undefined
}

/**
 * Tier management for one interest rate: a dialog listing existing tiers
 * (date range + amount band + rate) with add/edit/delete. Rate and amount
 * values follow @workspace/format conventions — no inline Intl parsing.
 */
export function TierEditorDialog({
  rate,
  open,
  onOpenChange,
}: {
  rate: InterestRate | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const [tiers, setTiers] = useState<InterestRateTier[]>([])
  const [loading, setLoading] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InterestRateTier | null>(null)
  const [form, setForm] = useState<TierForm>(emptyTierForm)
  const [savePending, setSavePending] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<InterestRateTier | null>(null)

  const currency = rate?.currency_code || "VND"

  const loadTiers = useCallback(async () => {
    if (!rate) return
    setLoading(true)
    try {
      const items = await interestRateApi.listTiers(rate.id)
      setTiers(items)
    } catch (error) {
      notify.error(translateApiError(error, t("interest_rates.tiers.load_failed")))
    } finally {
      setLoading(false)
    }
  }, [rate, t])

  useEffect(() => {
    if (!open || !rate) return
    setFormOpen(false)
    setEditing(null)
    setDeleteTarget(null)
    void loadTiers()
  }, [open, rate, loadTiers])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyTierForm, effective_from: todayISO() })
    setFormOpen(true)
  }

  const openEdit = (tier: InterestRateTier) => {
    setEditing(tier)
    setForm({
      effective_from: tier.effective_from ?? "",
      effective_to: tier.effective_to ?? "",
      amount_from: tier.amount_from != null ? String(tier.amount_from) : "",
      amount_to: tier.amount_to != null ? String(tier.amount_to) : "",
      rate_value: String(tier.rate_value ?? ""),
      min_rate: tier.min_rate != null ? String(tier.min_rate) : "",
      max_rate: tier.max_rate != null ? String(tier.max_rate) : "",
      decision_no: tier.decision_no ?? "",
      decision_date: tier.decision_date ?? "",
    })
    setFormOpen(true)
  }

  const submit = async () => {
    if (!rate) return
    if (!isValidISODate(form.effective_from)) {
      notify.error(t("interest_rates.tiers.validation.effective_from"))
      return
    }
    if (!form.rate_value.trim()) {
      notify.error(t("interest_rates.tiers.validation.rate_value"))
      return
    }
    const rateValue = optionalRate(form.rate_value)
    if (rateValue === undefined) {
      notify.error(t("interest_rates.tiers.validation.rate_value"))
      return
    }
    setSavePending(true)
    try {
      const body = {
        effective_from: form.effective_from,
        effective_to: isValidISODate(form.effective_to) ? form.effective_to : undefined,
        amount_from: optionalMoney(form.amount_from),
        amount_to: optionalMoney(form.amount_to),
        rate_value: rateValue,
        min_rate: optionalRate(form.min_rate),
        max_rate: optionalRate(form.max_rate),
        decision_no: form.decision_no.trim() || undefined,
        decision_date: isValidISODate(form.decision_date) ? form.decision_date : undefined,
      }
      if (editing) {
        await interestRateApi.updateTier(rate.id, editing.id, body)
      } else {
        await interestRateApi.createTier(rate.id, body)
      }
      notify.success(t("mdm.saved"))
      setFormOpen(false)
      await loadTiers()
    } catch (error) {
      notify.error(translateApiError(error, t("mdm.save_failed")))
    } finally {
      setSavePending(false)
    }
  }

  const handleDelete = async () => {
    if (!rate || !deleteTarget) return
    try {
      await interestRateApi.deleteTier(rate.id, deleteTarget.id)
      notify.success(t("mdm.deleted"))
      setDeleteTarget(null)
      await loadTiers()
    } catch (error) {
      notify.error(translateApiError(error, t("mdm.delete_failed")))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {rate ? `${t("interest_rates.tiers.title")} — ${rate.code}` : ""}
          </DialogTitle>
          <DialogDescription>
            {t("interest_rates.tiers.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("interest_rates.tiers.field.effective")}</TableHead>
                <TableHead className="text-right">
                  {t("interest_rates.tiers.field.amount_band")}
                </TableHead>
                <TableHead className="text-right">
                  {t("interest_rates.tiers.field.rate_value")}
                </TableHead>
                <TableHead>{t("interest_rates.tiers.field.decision")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("mdm.loading")}
                  </TableCell>
                </TableRow>
              ) : tiers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    {t("interest_rates.tiers.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                tiers.map((tier) => (
                  <TableRow key={tier.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDateShort(tier.effective_from)}
                      {" → "}
                      {tier.effective_to ? formatDateShort(tier.effective_to) : "∞"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {tier.amount_from != null || tier.amount_to != null
                        ? `${formatAmount(tier.amount_from, currency)} – ${formatAmount(tier.amount_to, currency)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {formatRatePercent(tier.rate_value)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {tier.decision_no || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openEdit(tier)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive"
                          onClick={() => setDeleteTarget(tier)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {formOpen ? (
          <div className="space-y-3 rounded-md border p-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="tier-from">
                  {t("interest_rates.tiers.field.effective_from")}
                </Label>
                <Input
                  id="tier-from"
                  type="date"
                  value={form.effective_from}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      effective_from: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-to">
                  {t("interest_rates.tiers.field.effective_to")}
                </Label>
                <Input
                  id="tier-to"
                  type="date"
                  value={form.effective_to}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      effective_to: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-amount-from">
                  {t("interest_rates.tiers.field.amount_from")}
                </Label>
                <Input
                  id="tier-amount-from"
                  inputMode="decimal"
                  placeholder={t("interest_rates.tiers.placeholder.optional")}
                  value={form.amount_from}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount_from: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-amount-to">
                  {t("interest_rates.tiers.field.amount_to")}
                </Label>
                <Input
                  id="tier-amount-to"
                  inputMode="decimal"
                  placeholder={t("interest_rates.tiers.placeholder.optional")}
                  value={form.amount_to}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount_to: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-rate">
                  {t("interest_rates.tiers.field.rate_value")}
                </Label>
                <Input
                  id="tier-rate"
                  inputMode="decimal"
                  value={form.rate_value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      rate_value: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-min-rate">
                  {t("interest_rates.tiers.field.min_rate")}
                </Label>
                <Input
                  id="tier-min-rate"
                  inputMode="decimal"
                  placeholder={t("interest_rates.tiers.placeholder.optional")}
                  value={form.min_rate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      min_rate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-max-rate">
                  {t("interest_rates.tiers.field.max_rate")}
                </Label>
                <Input
                  id="tier-max-rate"
                  inputMode="decimal"
                  placeholder={t("interest_rates.tiers.placeholder.optional")}
                  value={form.max_rate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      max_rate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-decision-no">
                  {t("interest_rates.tiers.field.decision_no")}
                </Label>
                <Input
                  id="tier-decision-no"
                  value={form.decision_no}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      decision_no: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                {t("mdm.cancel")}
              </Button>
              <Button onClick={() => void submit()} disabled={savePending}>
                {t("mdm.save")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              {t("interest_rates.tiers.create")}
            </Button>
          </div>
        )}

        <AlertDialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("interest_rates.tiers.delete_confirm_title")}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("interest_rates.tiers.delete_confirm_description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("mdm.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={(event) => {
                  event.preventDefault()
                  void handleDelete()
                }}
              >
                {t("mdm.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
