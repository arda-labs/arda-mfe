import { useEffect, useState } from "react"
import { Controller, useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { useI18n } from "@workspace/i18n"
import { financeApi } from "@/features/finance/api"

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

function createIdempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

interface PostTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful post so the page can refresh its server list. */
  onPosted?: () => void | Promise<void>
}

/** Double-entry posting dialog. Owns form state only; list refresh stays on the page. */
export function PostTransactionDialog({
  open,
  onOpenChange,
  onPosted,
}: PostTransactionDialogProps) {
  const { t } = useI18n()
  const [posting, setPosting] = useState(false)
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

  // Closing the dialog always returns to a pristine draft.
  useEffect(() => {
    if (!open) reset(transactionDefaultValues)
  }, [open, reset])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset(transactionDefaultValues)
    onOpenChange(nextOpen)
  }

  const handleCreate = handleSubmit(async (values) => {
    setPosting(true)
    try {
      await financeApi.createTransaction({
        ...values,
        idempotencyKey: createIdempotencyKey(),
      })
      notify.success("Transaction posted")
      onOpenChange(false)
      await onPosted?.()
    } catch (reason) {
      notify.error(
        reason instanceof Error ? reason.message : "Could not post transaction"
      )
    } finally {
      setPosting(false)
    }
  })

  return (
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
            disabled={isSubmitting || posting}
          >
            {t("common.action.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}