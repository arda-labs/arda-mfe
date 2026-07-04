import { useEffect, useMemo, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { ColumnDef } from "@tanstack/react-table"
import { parseAsInteger, useQueryState } from "nuqs"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useI18n } from "@workspace/i18n"
import { listPageCount } from "@workspace/core/http/list-api"
import { useDataTable } from "@workspace/ui/hooks/use-data-table"
import { ListPageShell } from "@workspace/ui/admin-list/list-page-shell"
import { ListTableToolbar } from "@workspace/ui/admin-list/list-table-toolbar"
import { useCreateTransaction, useTransactions } from "./queries"
import type { Transaction } from "@/features/finance/api"

const entrySchema = z.object({
  accountId: z.string().trim().min(1, "Account ID is required"),
  type: z.enum(["DEBIT", "CREDIT"]),
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required")
    .refine((value) => Number(value) > 0, "Amount must be positive"),
})

const transactionFormSchema = z
  .object({
    txnType: z.enum(["TRANSFER", "DEPOSIT", "WITHDRAWAL", "FEE"]),
    description: z
      .string()
      .trim()
      .max(500, "Description is too long")
      .optional(),
    entries: z.array(entrySchema).min(2, "At least two entries are required"),
  })
  .superRefine((values, ctx) => {
    const debit = values.entries
      .filter((entry) => entry.type === "DEBIT")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    const credit = values.entries
      .filter((entry) => entry.type === "CREDIT")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0)

    if (debit !== credit) {
      ctx.addIssue({
        code: "custom",
        message: "Debit total must equal credit total",
        path: ["entries"],
      })
    }
  })

type TransactionFormValues = z.infer<typeof transactionFormSchema>

const transactionDefaultValues: TransactionFormValues = {
  txnType: "TRANSFER",
  description: "",
  entries: [
    { accountId: "", type: "DEBIT", amount: "" },
    { accountId: "", type: "CREDIT", amount: "" },
  ],
}

const STATUS_VARIANTS: Partial<
  Record<string, "default" | "success" | "error" | "warning" | "info">
> = {
  POSTED: "success",
  PENDING: "warning",
  REVERSED: "default",
  FAILED: "error",
}

const DEFAULT_PAGE_SIZE = 10

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export function TransactionsPage() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [pageParam] = useQueryState("page", parseAsInteger.withDefault(1))
  const [perPageParam] = useQueryState(
    "perPage",
    parseAsInteger.withDefault(DEFAULT_PAGE_SIZE)
  )
  const {
    data,
    isError: isTransactionsError,
    isLoading,
  } = useTransactions({ page: pageParam, size: perPageParam })
  const createTransaction = useCreateTransaction()
  const txns = data?.transactions ?? []
  const total = data?.total ?? 0
  const pageCount = listPageCount(total, perPageParam)
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: transactionDefaultValues,
  })
  const { append, fields } = useFieldArray({ control, name: "entries" })

  useEffect(() => {
    if (isTransactionsError) notify.error("Could not load transactions")
  }, [isTransactionsError])

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: "id",
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="ID" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.id.slice(0, 8)}…
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "txnType",
        accessorKey: "txnType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.type")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.txnType}</span>
        ),
        enableSorting: false,
      },
      {
        id: "postedAt",
        accessorKey: "postedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.date")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.postedAt).toLocaleDateString()}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.status")}
          />
        ),
        cell: ({ row }) => (
          <Status variant={STATUS_VARIANTS[row.original.status] || "default"}>
            <StatusIndicator />
            <StatusLabel>{row.original.status}</StatusLabel>
          </Status>
        ),
        enableSorting: false,
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("common.field.description")}
          />
        ),
        cell: ({ row }) => (
          <span className="max-w-xs truncate text-muted-foreground">
            {row.original.description || "—"}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: "createdBy",
        accessorKey: "createdBy",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="Created By" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.createdBy.slice(0, 8)}
          </span>
        ),
        enableSorting: false,
      },
    ],
    [t]
  )

  const { table } = useDataTable<Transaction>({
    columns,
    data: txns,
    pageCount,
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: DEFAULT_PAGE_SIZE,
      },
    },
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset(transactionDefaultValues)
  }

  const handleCreate = handleSubmit(async (values) => {
    const idempotencyKey = createIdempotencyKey()
    try {
      await createTransaction.mutateAsync({ ...values, idempotencyKey })
      setOpen(false)
      reset(transactionDefaultValues)
    } catch {
      // Mutation hook owns the toast.
    }
  })

  const dialogs = (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("finance.transactions.title")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleCreate}>
          <FormField
            label={t("common.field.type")}
            error={errors.txnType?.message}
          >
            <Controller
              control={control}
              name="txnType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger aria-invalid={Boolean(errors.txnType)}>
                    <SelectValue placeholder={t("common.field.type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFER">Transfer</SelectItem>
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                    <SelectItem value="FEE">Fee</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label={t("common.field.description")}
            error={errors.description?.message}
          >
            <Input
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
          </FormField>

          <p className="text-sm font-medium">Entries (debit = credit)</p>
          {typeof errors.entries?.message === "string" ? (
            <p className="text-xs font-medium text-destructive">
              {errors.entries.message}
            </p>
          ) : null}
          {fields.map((entry, i) => (
            <div
              key={entry.id}
              className="grid gap-3 sm:grid-cols-[1fr_7rem_7rem]"
            >
              <FormField
                label="Account ID"
                error={errors.entries?.[i]?.accountId?.message}
              >
                <Input
                  aria-invalid={Boolean(errors.entries?.[i]?.accountId)}
                  {...register(`entries.${i}.accountId`)}
                />
              </FormField>
              <FormField
                label={t("common.field.type")}
                error={errors.entries?.[i]?.type?.message}
              >
                <Controller
                  control={control}
                  name={`entries.${i}.type`}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        aria-invalid={Boolean(errors.entries?.[i]?.type)}
                      >
                        <SelectValue placeholder={t("common.field.type")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEBIT">
                          {t("finance.entry.debit")}
                        </SelectItem>
                        <SelectItem value="CREDIT">
                          {t("finance.entry.credit")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Amount" error={errors.entries?.[i]?.amount?.message}>
                <Input
                  aria-invalid={Boolean(errors.entries?.[i]?.amount)}
                  {...register(`entries.${i}.amount`)}
                />
              </FormField>
            </div>
          ))}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() =>
                append({ accountId: "", type: "DEBIT", amount: "" })
              }
            >
              + Entry
            </Button>
          </div>

          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || createTransaction.isPending}
          >
            {t("common.action.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )

  return (
    <ListPageShell
      title={t("finance.transactions.title")}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {total}
        </Badge>
      }
      loading={isLoading}
      isEmpty={txns.length === 0}
      skeletonColumns={6}
      skeletonFilters={0}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={() => setOpen(true)}
          createLabel={t("common.action.create")}
        />
      }
      dialogs={dialogs}
    />
  )
}
