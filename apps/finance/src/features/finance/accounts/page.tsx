import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { notify } from "@workspace/notifications/notify"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Badge } from "@workspace/ui/components/badge"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { useI18n } from "@workspace/i18n"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { ListPageShell } from "@workspace/ui/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/ui/admin-list/list-table-toolbar"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/ui/admin-list/client-list"
import {
  activeStatusMeta,
  getSingleSelectValue,
  matchTextColumnFilter,
  textSearchMeta,
} from "@workspace/ui/admin-list/column-filters"
import { useAccounts, useCreateAccount } from "./queries"
import { listQueryShellState, pageGateFromQueries } from "@workspace/core/query/list-query"
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

const DEFAULT_PAGE_SIZE = 20

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

export function AccountsPage() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const accountsQuery = useAccounts()
  const pageGate = pageGateFromQueries(accountsQuery)
  const { fetching } = listQueryShellState(accountsQuery)
  const accounts = accountsQuery.data ?? []
  const isAccountsError = accountsQuery.isError
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

  const columns = useMemo<ColumnDef<Account>[]>(
    () => [
      {
        id: "code",
        accessorKey: "code",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.code")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("common.field.code"),
          t("common.field.code")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.original.code}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.name")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("common.field.name"),
          t("common.field.name")
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      },
      {
        id: "type",
        accessorKey: "type",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.type")}
          />
        ),
        cell: ({ row }) => (
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${ACCOUNT_TYPE_COLORS[row.original.type] || ""}`}
          >
            {accountTypeLabel(row.original.type, t)}
          </span>
        ),
      },
      {
        id: "normalBalance",
        accessorKey: "normalBalance",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("finance.accounts.field.normal_balance")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.normalBalance === "DEBIT"
              ? t("finance.entry.debit")
              : t("finance.entry.credit")}
          </span>
        ),
      },
      {
        id: "currency",
        accessorKey: "currency",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.currency")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.currency}
          </span>
        ),
      },
      {
        id: "isActive",
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: activeStatusMeta(
          t("common.field.status"),
          t("common.status.active"),
          t("common.status.inactive")
        ),
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
    [t]
  )

  const { table, total } = useClientListTable({
    columns,
    items: accounts,
    filterBy: {
      code: (item, value) => matchTextColumnFilter(value, item.code),
      name: (item, value) => matchTextColumnFilter(value, item.name),
      isActive: (item, value) => {
        const selected = getSingleSelectValue(value)
        if (!selected) return true
        return item.isActive === (selected === "true")
      },
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        type: (a, b) => a.type.localeCompare(b.type),
        normalBalance: (a, b) => a.normalBalance.localeCompare(b.normalBalance),
        currency: (a, b) => a.currency.localeCompare(b.currency),
        isActive: (a, b) => Number(a.isActive) - Number(b.isActive),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

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

  const dialogs = (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
  )

  return (
    <ListPageShell
      title={t("finance.accounts.title")}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("finance.accounts.count", { count: total })}
        </Badge>
      }
      criticalPending={pageGate.criticalPending}
      criticalError={pageGate.criticalError}
      onRetry={pageGate.onRetry}
      fetching={fetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setOpen(true)}
          createLabel={t("finance.accounts.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
