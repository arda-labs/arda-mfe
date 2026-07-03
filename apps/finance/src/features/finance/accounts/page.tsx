import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table"
import { Wallet } from "lucide-react"
import { notify } from "@workspace/notifications/notify"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Page } from "@workspace/ui/components/page"
import { PageHeader } from "@workspace/ui/components/page-header"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { useI18n } from "@workspace/i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useAccounts, useCreateAccount } from "./queries"
import type { Account } from "@/features/finance/api"

const accountFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(64, "Code is too long"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(255, "Name is too long"),
  type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
  normalBalance: z.enum(["DEBIT", "CREDIT"]),
  currency: z
    .string()
    .trim()
    .min(3, "Currency is required")
    .max(3, "Use a 3-letter currency code"),
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
  const [open, setOpen] = useState(false)
  const {
    data: accounts = [],
    isError: isAccountsError,
    isLoading,
  } = useAccounts()
  const createAccount = useCreateAccount()
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

  useEffect(() => {
    if (isAccountsError) notify.error("Could not load accounts")
  }, [isAccountsError])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset(accountDefaultValues)
  }

  const handleCreate = handleSubmit(async (values) => {
    try {
      await createAccount.mutateAsync(values)
      setOpen(false)
      reset(accountDefaultValues)
    } catch {
      // Mutation hook owns the toast.
    }
  })

  const handleTypeChange = (type: AccountFormValues["type"]) => {
    setValue("type", type, { shouldDirty: true, shouldValidate: true })
    setValue(
      "normalBalance",
      type === "ASSET" || type === "EXPENSE" ? "DEBIT" : "CREDIT",
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    )
  }

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )

  return (
    <Page>
      <PageHeader
        title={t("finance.accounts.title")}
        icon={Wallet}
        badge={
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            {t("finance.accounts.count", { count: accounts.length })}
          </Badge>
        }
        actions={
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger className="h-9 px-4 text-sm">
              {t("finance.accounts.create")}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("finance.accounts.create")}</DialogTitle>
              </DialogHeader>
              <form className="space-y-3" onSubmit={handleCreate}>
                <FormField
                  label={t("common.field.code")}
                  error={errors.code?.message}
                >
                  <Input
                    aria-invalid={Boolean(errors.code)}
                    {...register("code")}
                  />
                </FormField>
                <FormField
                  label={t("common.field.name")}
                  error={errors.name?.message}
                >
                  <Input
                    aria-invalid={Boolean(errors.name)}
                    {...register("name")}
                  />
                </FormField>
                <FormField
                  label={t("common.field.type")}
                  error={errors.type?.message}
                >
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(val) =>
                          handleTypeChange(val as AccountFormValues["type"])
                        }
                      >
                        <SelectTrigger aria-invalid={Boolean(errors.type)}>
                          <SelectValue placeholder={t("common.field.type")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ASSET">
                            {t("finance.account_type.asset")}
                          </SelectItem>
                          <SelectItem value="LIABILITY">
                            {t("finance.account_type.liability")}
                          </SelectItem>
                          <SelectItem value="EQUITY">
                            {t("finance.account_type.equity")}
                          </SelectItem>
                          <SelectItem value="INCOME">
                            {t("finance.account_type.income")}
                          </SelectItem>
                          <SelectItem value="EXPENSE">
                            {t("finance.account_type.expense")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
                <FormField
                  label={t("common.field.currency")}
                  error={errors.currency?.message}
                >
                  <Input
                    aria-invalid={Boolean(errors.currency)}
                    {...register("currency")}
                  />
                </FormField>
                <Button
                  className="w-full"
                  type="submit"
                  disabled={isSubmitting || createAccount.isPending}
                >
                  {t("common.action.create")}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <AccountsTable accounts={accounts} />
    </Page>
  )
}

function AccountsTable({ accounts }: { accounts: Account[] }) {
  const { t } = useI18n()
  const [sorting, setSorting] = useState<SortingState>([])
  const columns = useMemo<ColumnDef<Account>[]>(
    () => [
      {
        accessorKey: "code",
        header: t("common.field.code"),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        accessorKey: "name",
        header: t("common.field.name"),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "type",
        header: t("common.field.type"),
        cell: ({ row }) => (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACCOUNT_TYPE_COLORS[row.original.type] || ""}`}
          >
            {accountTypeLabel(row.original.type, t)}
          </span>
        ),
      },
      {
        accessorKey: "normalBalance",
        header: t("finance.accounts.field.normal_balance"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.normalBalance === "DEBIT"
              ? t("finance.entry.debit")
              : t("finance.entry.credit")}
          </span>
        ),
      },
      {
        accessorKey: "currency",
        header: t("common.field.currency"),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.currency}
          </span>
        ),
      },
      {
        accessorKey: "isActive",
        header: t("common.field.status"),
        cell: ({ row }) => (
          <Status variant={row.original.isActive ? "success" : "default"}>
            <StatusIndicator />
            <StatusLabel>
              {row.original.isActive
                ? t("common.status.active")
                : t("common.status.inactive")}
            </StatusLabel>
          </Status>
        ),
      },
    ],
    [t],
  )
  const table = useReactTable({
    data: accounts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  return <DataTable table={table} defaultDensity="comfortable" />
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
