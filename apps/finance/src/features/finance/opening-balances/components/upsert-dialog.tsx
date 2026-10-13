import { useEffect, useState } from "react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { DateField } from "@workspace/ui/components/date-field"
import { Label } from "@workspace/ui/components/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { parseMoneyInput, toMinor } from "@workspace/format"
import { ChooseAccountDialog } from "@workspace/posting-flow/choose-account-dialog"
import type { AccountOption } from "@workspace/posting-flow/types"
import { accountsApi, postingApi } from "../../api"
import { SegmentedControl } from "@workspace/ui/components/segmented-control"
import { MoneyInput } from "@workspace/ui/components/money-input"

interface FormState {
  accountingDate: string
  coaVersion: string
  accountCode: string
  accountName: string
  currency: string
  direction: "DEBIT" | "CREDIT"
  amount: string
  description: string
  sourceKey: string
}

function emptyForm(defaultDate: string): FormState {
  return {
    accountingDate: defaultDate,
    coaVersion: "",
    accountCode: "",
    accountName: "",
    currency: "VND",
    direction: "DEBIT",
    amount: "",
    description: "",
    sourceKey: "",
  }
}

export function UpsertOpeningBalanceDialog({
  open,
  defaultDate,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  defaultDate: string
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>(() => emptyForm(defaultDate))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm(emptyForm(defaultDate))
  }, [open, defaultDate])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  async function save() {
    const amountMajor = parseMoneyInput(form.amount)
    if (!form.accountingDate || !form.accountCode.trim()) {
      notify.error(
        translateApiError(t("finance.opening_balances.validation.required"))
      )
      return
    }
    if (amountMajor === undefined || amountMajor <= 0) {
      notify.error(
        translateApiError(t("finance.opening_balances.validation.amount"))
      )
      return
    }
    setSaving(true)
    try {
      await postingApi.upsertOpeningBalance({
        accounting_date: form.accountingDate,
        coa_version: form.coaVersion.trim(),
        account_code: form.accountCode.trim(),
        currency_code: form.currency.trim() || "VND",
        direction: form.direction,
        amount_minor: toMinor(amountMajor, form.currency.trim() || "VND"),
        description: form.description.trim(),
        source_key: form.sourceKey.trim(),
      })
      notify.success(t("finance.opening_balances.save_success"))
      onSaved()
    } catch (error) {
      notify.error(
        translateApiError(error, t("finance.opening_balances.save_failed"))
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!saving) onOpenChange(next)
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("finance.opening_balances.dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ob-date">
                {t("finance.opening_balances.field.accounting_date")}
              </Label>
              <DateField
                id="ob-date"
                value={form.accountingDate}
                onChange={(event) => update("accountingDate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-version">
                {t("finance.opening_balances.field.coa_version")}
              </Label>
              <Input
                id="ob-version"
                placeholder={t("finance.opening_balances.placeholder.version")}
                value={form.coaVersion}
                onChange={(event) => update("coaVersion", event.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ob-account">
                {t("finance.opening_balances.field.account")}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="ob-account"
                  className="tabular-nums"
                  placeholder={t("finance.opening_balances.placeholder.account")}
                  value={form.accountCode}
                  onChange={(event) => update("accountCode", event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPickerOpen(true)}
                >
                  {t("finance.opening_balances.pick_account")}
                </Button>
              </div>
              {form.accountName ? (
                <p className="text-xs text-muted-foreground">{form.accountName}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-currency">
                {t("finance.opening_balances.field.currency")}
              </Label>
              <Input
                id="ob-currency"
                value={form.currency}
                onChange={(event) => update("currency", event.target.value.toUpperCase())}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("finance.opening_balances.field.direction")}</Label>
              <SegmentedControl
                value={form.direction}
                onValueChange={(value) =>
                  update("direction", value as FormState["direction"])
                }
                fullWidth
                options={[
                  { value: "DEBIT", label: t("finance.opening_balances.direction.DEBIT") },
                  { value: "CREDIT", label: t("finance.opening_balances.direction.CREDIT") },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-amount">
                {t("finance.opening_balances.field.amount")}
              </Label>
              <MoneyInput
                id="ob-amount"
                placeholder="0"
                value={form.amount}
                onChange={(event) => update("amount", event.target.value)}
                currency={form.currency.trim() || "VND"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ob-source">
                {t("finance.opening_balances.field.source_key")}
              </Label>
              <Input
                id="ob-source"
                placeholder={t("finance.opening_balances.placeholder.source_key")}
                value={form.sourceKey}
                onChange={(event) => update("sourceKey", event.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ob-description">
                {t("finance.opening_balances.field.description")}
              </Label>
              <Input
                id="ob-description"
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              {t("finance.opening_balances.dialog.cancel")}
            </Button>
            <Button type="button" disabled={saving} onClick={() => void save()}>
              {t("finance.opening_balances.dialog.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChooseAccountDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(account: AccountOption) => {
          update("accountCode", account.code)
          update("accountName", account.name)
          setPickerOpen(false)
        }}
        fetchAccounts={(params) =>
          accountsApi
            .listCoaAccounts()
            .then((res) => {
              const q = params.q?.trim().toLowerCase()
              const filtered = res.items.filter(
                (account) =>
                  account.isPostable &&
                  (!q ||
                    account.accCode.toLowerCase().includes(q) ||
                    account.name.toLowerCase().includes(q))
              )
              const start = (params.page - 1) * params.perPage
              return {
                items: filtered
                  .slice(start, start + params.perPage)
                  .map((account) => ({
                    code: account.accCode,
                    name: account.name,
                  })),
                total: filtered.length,
              }
            })
        }
        labels={{
          title: t("finance.opening_balances.account_dialog.title"),
          searchPlaceholder: t("finance.opening_balances.account_dialog.search"),
          colCode: t("finance.opening_balances.account_dialog.code"),
          colName: t("finance.opening_balances.account_dialog.name"),
          colCurrency: t("finance.opening_balances.account_dialog.currency"),
          empty: t("finance.opening_balances.account_dialog.empty"),
          prev: t("finance.opening_balances.account_dialog.prev"),
          next: t("finance.opening_balances.account_dialog.next"),
          pageOf: t("finance.opening_balances.account_dialog.page_of"),
          close: t("finance.opening_balances.account_dialog.close"),
        }}
      />
    </>
  )
}
