import { useEffect, useState } from "react"
import { financeApi } from "@/features/finance/api"
import type { Account, AccountBalance } from "@/features/finance/api"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { useI18n } from "@workspace/i18n"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  ASSET: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  LIABILITY:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  EQUITY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  INCOME:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  EXPENSE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
}

export function AccountsPage() {
  const { t } = useI18n()
  const [accounts, setAccounts] = useState<
    (Account & { balance?: AccountBalance })[]
  >([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    code: "",
    name: "",
    type: "ASSET",
    normalBalance: "DEBIT",
    currency: "VND",
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await financeApi.listAccounts()
      setAccounts(res.accounts)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async () => {
    await financeApi.createAccount(form)
    setOpen(false)
    setForm({
      code: "",
      name: "",
      type: "ASSET",
      normalBalance: "DEBIT",
      currency: "VND",
    })
    load()
  }

  if (loading)
    return (
      <div className="flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            {t("finance.accounts.count", { count: accounts.length })}
          </Badge>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="h-9 px-4 text-sm">{t("finance.accounts.create")}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("finance.accounts.create")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <FormField label={t("common.field.code")}>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                  }
                />
              </FormField>
              <FormField label={t("common.field.name")}>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </FormField>
              <FormField label={t("common.field.type")}>
                <Select
                  value={form.type}
                  onValueChange={(val) =>
                    setForm((p) => ({
                      ...p,
                      type: val,
                      normalBalance:
                        val === "ASSET" ||
                        val === "EXPENSE"
                          ? "DEBIT"
                          : "CREDIT",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.field.type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSET">{t("finance.account_type.asset")}</SelectItem>
                    <SelectItem value="LIABILITY">{t("finance.account_type.liability")}</SelectItem>
                    <SelectItem value="EQUITY">{t("finance.account_type.equity")}</SelectItem>
                    <SelectItem value="INCOME">{t("finance.account_type.income")}</SelectItem>
                    <SelectItem value="EXPENSE">{t("finance.account_type.expense")}</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t("common.field.currency")}>
                <Input
                  value={form.currency}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, currency: e.target.value }))
                  }
                />
              </FormField>
              <Button className="w-full" onClick={handleCreate}>
                {t("common.action.create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left font-medium">
                {t("common.field.code")}
              </th>
              <th className="p-3 text-left font-medium">
                {t("common.field.name")}
              </th>
              <th className="p-3 text-left font-medium">
                {t("common.field.type")}
              </th>
              <th className="p-3 text-left font-medium">
                {t("finance.accounts.field.normal_balance")}
              </th>
              <th className="p-3 text-left font-medium">
                {t("common.field.currency")}
              </th>
              <th className="p-3 text-left font-medium">
                {t("common.field.status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr
                key={a.id}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                <td className="p-3 font-mono text-sm">{a.code}</td>
                <td className="p-3 font-medium">{a.name}</td>
                <td className="p-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACCOUNT_TYPE_COLORS[a.type] || ""}`}
                  >
                    {accountTypeLabel(a.type, t)}
                  </span>
                </td>
                <td className="p-3 text-muted-foreground">
                  {a.normalBalance === "DEBIT"
                    ? t("finance.entry.debit")
                    : t("finance.entry.credit")}
                </td>
                <td className="p-3 text-muted-foreground">{a.currency}</td>
                <td className="p-3">
                  <Status variant={a.isActive ? "success" : "default"}>
                    <StatusIndicator />
                    <StatusLabel>
                      {a.isActive
                        ? t("common.status.active")
                        : t("common.status.inactive")}
                    </StatusLabel>
                  </Status>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function accountTypeLabel(type: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (type) {
    case "ASSET":
      return t("finance.account_type.asset")
    case "LIABILITY":
      return t("finance.account_type.liability")
    case "EQUITY":
      return t("finance.account_type.equity")
    case "INCOME":
      return t("finance.account_type.income")
    case "EXPENSE":
      return t("finance.account_type.expense")
    default:
      return type
  }
}
