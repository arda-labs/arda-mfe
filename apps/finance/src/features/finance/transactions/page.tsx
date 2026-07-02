import { useEffect, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useCreateTransaction, useTransactions } from "./queries"

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

export function TransactionsPage() {
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState(false)
  const size = DEFAULT_PAGE_SIZE
  const {
    data,
    isError: isTransactionsError,
    isLoading,
  } = useTransactions({ page, size })
  const createTransaction = useCreateTransaction()
  const txns = data?.transactions || []
  const total = data?.total || 0
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

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) reset(transactionDefaultValues)
  }

  const handleCreate = handleSubmit(async (values) => {
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    try {
      await createTransaction.mutateAsync({ ...values, idempotencyKey })
      setOpen(false)
      reset(transactionDefaultValues)
    } catch {
      // Mutation hook owns the toast.
    }
  })

  const totalPages = data?.totalPages || Math.ceil(total / size)

  if (isLoading)
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
            {total} total
          </Badge>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger className="h-9 px-4 text-sm">
            Create Transaction
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Transaction</DialogTitle>
            </DialogHeader>
            <form className="space-y-3" onSubmit={handleCreate}>
              <FormField
                label="Transaction type"
                error={errors.txnType?.message}
              >
                <Controller
                  control={control}
                  name="txnType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={Boolean(errors.txnType)}>
                        <SelectValue placeholder="Select type" />
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
                label="Description"
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
                    label="Type"
                    error={errors.entries?.[i]?.type?.message}
                  >
                    <Controller
                      control={control}
                      name={`entries.${i}.type`}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            aria-invalid={Boolean(errors.entries?.[i]?.type)}
                          >
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DEBIT">Debit</SelectItem>
                            <SelectItem value="CREDIT">Credit</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                  <FormField
                    label="Amount"
                    error={errors.entries?.[i]?.amount?.message}
                  >
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
                Post Transaction
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left font-medium">ID</th>
              <th className="p-3 text-left font-medium">Type</th>
              <th className="p-3 text-left font-medium">Date</th>
              <th className="p-3 text-left font-medium">Status</th>
              <th className="p-3 text-left font-medium">Description</th>
              <th className="p-3 text-left font-medium">Created By</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr
                key={t.id}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                <td className="p-3 font-mono text-xs">{t.id.slice(0, 8)}…</td>
                <td className="p-3 font-medium">{t.txnType}</td>
                <td className="p-3 text-muted-foreground">
                  {new Date(t.postedAt).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <Status variant={STATUS_VARIANTS[t.status] || "default"}>
                    <StatusIndicator />
                    <StatusLabel>{t.status}</StatusLabel>
                  </Status>
                </td>
                <td className="max-w-xs truncate p-3 text-muted-foreground">
                  {t.description || "—"}
                </td>
                <td className="p-3 text-muted-foreground">
                  {t.createdBy.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
