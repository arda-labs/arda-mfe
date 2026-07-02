import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "react-toastify"
import { z } from "zod"
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

const accountFormSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(64, "Code is too long"),
  name: z.string().trim().min(1, "Name is required").max(255, "Name is too long"),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  normalBalance: z.enum(["DEBIT", "CREDIT"]),
  currency: z.string().trim().min(3, "Currency is required").max(3, "Use a 3-letter currency code"),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

const accountDefaultValues: AccountFormValues = {
  code: "",
  name: "",
  type: "ASSET",
  normalBalance: "DEBIT",
  currency: "VND",
}

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
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: accountDefaultValues,
  })

  const load = async () => {
    setLoading(true)
    try {
      const res = await financeApi.listAccounts()
      setAccounts(res.accounts)
    } catch {
      toast.error("Could not load accounts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset(accountDefaultValues)
  }

  const handleCreate = handleSubmit(async (values) => {
    try {
      await financeApi.createAccount(values)
      toast.success("Account created")
      setOpen(false)
      reset(accountDefaultValues)
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create account")
    }
  })

  const handleTypeChange = (type: AccountFormValues["type"]) => {
    setValue("type", type, { shouldDirty: true, shouldValidate: true })
    setValue("normalBalance", type === "ASSET" || type === "EXPENSE" ? "DEBIT" : "CREDIT", {
      shouldDirty: true,
      shouldValidate: true,
    })
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
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger className="h-9 px-4 text-sm">{t("finance.accounts.create")}</DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("finance.accounts.create")}</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleCreate}>
              <FormField label={t("common.field.code")} error={errors.code?.message}>
                <Input
                  aria-invalid={Boolean(errors.code)}
                  {...register("code")}
                />
              </FormField>
              <FormField label={t("common.field.name")} error={errors.name?.message}>
                <Input
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                />
              </FormField>
              <FormField label={t("common.field.type")} error={errors.type?.message}>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => handleTypeChange(val as AccountFormValues["type"])}
                    >
                      <SelectTrigger aria-invalid={Boolean(errors.type)}>
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
                  )}
                />
              </FormField>
              <FormField label={t("common.field.currency")} error={errors.currency?.message}>
                <Input
                  aria-invalid={Boolean(errors.currency)}
                  {...register("currency")}
                />
              </FormField>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {t("common.action.create")}
              </Button>
            </form>
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
