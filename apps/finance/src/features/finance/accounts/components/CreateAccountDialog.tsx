import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { accountsApi, type Account } from "@/features/finance/api"
import { notify } from "@workspace/ui/feedback/notify"
import { translateApiError, useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const accountFormSchema = (t: ReturnType<typeof useI18n>["t"]) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t("finance.accounts.validation.code_required"))
      .max(64, t("finance.accounts.validation.code_max")),
    name: z
      .string()
      .trim()
      .min(1, t("finance.accounts.validation.name_required"))
      .max(255, t("finance.accounts.validation.name_max")),
    type: z.enum(["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]),
    normalBalance: z.enum(["DEBIT", "CREDIT"]),
    currency: z
      .string()
      .trim()
      .min(3, t("finance.accounts.validation.currency_required"))
      .max(3, t("finance.accounts.validation.currency_max")),
  })

type AccountFormValues = {
  code: string
  name: string
  type: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE"
  normalBalance: "DEBIT" | "CREDIT"
  currency: string
}

const accountDefaultValues: AccountFormValues = {
  code: "",
  name: "",
  type: "ASSET",
  normalBalance: "DEBIT",
  currency: "VND",
}

/** Create/edit dialog for the account master (code is immutable when editing). */
export function CreateAccountDialog({
  open,
  onOpenChange,
  onCreated,
  editing,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => Promise<void>
  editing?: Account | null
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema(t)),
    defaultValues: accountDefaultValues,
  })

  useEffect(() => {
    if (!open) return
    if (editing) {
      reset({
        code: editing.code,
        name: editing.name,
        type: editing.type as AccountFormValues["type"],
        normalBalance: editing.normalBalance as AccountFormValues["normalBalance"],
        currency: editing.currency,
      })
      setIsActive(editing.isActive)
      return
    }
    reset(accountDefaultValues)
    setIsActive(true)
  }, [open, editing, reset])

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      reset(accountDefaultValues)
      setIsActive(true)
    }
  }

  const handleSubmitForm = handleSubmit(async (values) => {
    setSaving(true)
    try {
      if (editing) {
        await accountsApi.updateAccount(editing.id, {
          name: values.name,
          type: values.type,
          normalBalance: values.normalBalance,
          currency: values.currency,
          isActive,
        })
        notify.success(t("finance.accounts.update_success"))
      } else {
        await accountsApi.createAccount(values)
        notify.success(t("finance.accounts.create_success"))
      }
      handleOpenChange(false)
      await onCreated()
    } catch (reason) {
      notify.error(
        t(
          editing
            ? "finance.accounts.update_failed"
            : "finance.accounts.create_failed"
        ),
        translateApiError(reason)
      )
    } finally {
      setSaving(false)
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t("finance.accounts.edit")
              : t("finance.accounts.create")}
          </DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmitForm}>
          <FormField
            label={t("common.field.code")}
            error={errors.code?.message}
          >
            <Input
              aria-invalid={Boolean(errors.code)}
              disabled={Boolean(editing)}
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
                  onValueChange={(value) =>
                    handleTypeChange(value as AccountFormValues["type"])
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
          {editing ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              {t("common.status.active")}
            </label>
          ) : null}
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || saving}
          >
            {editing ? t("common.action.save") : t("common.action.create")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
