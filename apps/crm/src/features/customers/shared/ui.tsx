import type { ChangeEvent, ReactNode } from "react"
import { Controller, type UseFormReturn } from "react-hook-form"
import { getMediaContentUrl } from "@workspace/media"
import { useI18n } from "@workspace/i18n"
import { CheckCircle2, Circle, Clock3, FileText, Upload } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  TableCell,
  TableRow,
} from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"
import type { Customer } from "../api"
import {
  type CustomerFormValues,
} from "./schemas"
import { optionsFor } from "./form-utils"

export function FieldGrid({
  fields,
  form,
  bare = false,
}: {
  fields: Array<
    [keyof CustomerFormValues, string, "input" | "select" | "textarea" | "date"]
  >
  form: UseFormReturn<CustomerFormValues>
  bare?: boolean
}) {
  const content = (
    <>
      {fields.map(([name, label, type]) => (
        <FormField
          key={name}
          label={label}
          error={form.formState.errors[name]?.message}
        >
          {type === "select" ? (
            <Controller
              control={form.control}
              name={name}
              render={({ field }) => (
                <Select
                  value={String(field.value || "none")}
                  onValueChange={(value) =>
                    field.onChange(value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {optionsFor(name).map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          ) : type === "textarea" ? (
            <Textarea rows={2} {...form.register(name)} />
          ) : (
            <Input
              type={type === "date" ? "date" : "text"}
              {...form.register(name)}
            />
          )}
        </FormField>
      ))}
    </>
  )

  if (bare) return content

  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{content}</div>
}

export function AvatarUploader({
  fileId,
  uploading,
  onClear,
  onUpload,
}: {
  fileId: string
  uploading: boolean
  onClear: () => void
  onUpload: (file: File) => Promise<void>
}) {
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    await onUpload(file)
    event.target.value = ""
  }

  return (
    <div className="space-y-2">
      <div className="flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-md border bg-muted/30">
        {fileId ? (
          <img
            alt="Avatar khách hàng"
            className="h-full w-full object-cover"
            src={getMediaContentUrl(fileId)}
          />
        ) : (
          <div className="px-4 text-center text-sm text-muted-foreground">
            Ảnh đại diện
          </div>
        )}
      </div>
      <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted">
        <Upload className="size-4" />
        {uploading ? "Đang tải" : "Upload"}
        <input
          accept="image/*"
          className="sr-only"
          disabled={uploading}
          type="file"
          onChange={handleFile}
        />
      </label>
      {fileId ? (
        <Button
          className="w-full"
          disabled={uploading}
          type="button"
          variant="ghost"
          onClick={onClear}
        >
          Xóa ảnh
        </Button>
      ) : null}
    </div>
  )
}

export function RegistrationSubmittedBanner({
  customer,
  onOpenWorkbench,
  t,
}: {
  customer: Customer | null
  onOpenWorkbench: () => void
  t: ReturnType<typeof useI18n>["t"]
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p>{t("crm.customers.registrations.submitted_banner")}</p>
        {customer?.workflowCaseId ? (
          <p className="font-mono text-xs text-sky-800">
            Case BPM: {customer.workflowCaseId}
          </p>
        ) : null}
      </div>
      <Button className="h-8 shrink-0" type="button" variant="secondary" onClick={onOpenWorkbench}>
        {t("crm.customers.registrations.submitted_open_workbench")}
      </Button>
    </div>
  )
}

export function RegistrationFlowBar({ customer }: { customer: Customer | null }) {
  const status = customer?.status ?? "NEW"
  const steps = [
    {
      key: "DRAFT",
      label: "1. Luu nhap",
      hint: customer?.customerCode ? customer.customerCode : "Chua co ma ho so",
      done: Boolean(customer?.id),
      active: status === "NEW" || status === "DRAFT" || status === "NEEDS_CHANGES",
    },
    {
      key: "SUBMITTED",
      label: "2. Trinh duyet",
      hint: "Day ho so sang BPM",
      done: status === "SUBMITTED" || status === "ACTIVE" || status === "REJECTED",
      active: status === "SUBMITTED",
    },
    {
      key: "REVIEW",
      label: "3. Checker xu ly",
      hint: "Workbench giao dich den",
      done: status === "ACTIVE" || status === "REJECTED",
      active: status === "SUBMITTED",
    },
    {
      key: "DONE",
      label: "4. Ket qua",
      hint:
        status === "ACTIVE"
          ? "Da kich hoat"
          : status === "REJECTED"
            ? "Da tu choi"
            : "Cho quyet dinh",
      done: status === "ACTIVE" || status === "REJECTED",
      active: status === "ACTIVE" || status === "REJECTED",
    },
  ]

  return (
    <div className="grid gap-2 rounded-md border bg-background p-3 text-sm md:grid-cols-4">
      {steps.map((step) => {
        const Icon = step.done ? CheckCircle2 : step.active ? Clock3 : Circle
        return (
          <div
            key={step.key}
            className="flex min-w-0 items-start gap-2 rounded-sm px-2 py-1.5"
          >
            <Icon
              className={
                step.done
                  ? "mt-0.5 size-4 shrink-0 text-emerald-600"
                  : step.active
                    ? "mt-0.5 size-4 shrink-0 text-sky-600"
                    : "mt-0.5 size-4 shrink-0 text-muted-foreground"
              }
            />
            <div className="min-w-0">
              <p className="truncate font-medium">{step.label}</p>
              <p className="truncate text-xs text-muted-foreground">{step.hint}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function RegistrationMetaBar({ customer }: { customer: Customer | null }) {
  if (!customer?.customerCode) return null
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
      <span>
        Mã hồ sơ:{" "}
        <span className="font-mono font-medium">{customer.customerCode}</span>
      </span>
      {customer.workflowCaseId ? (
        <span className="text-muted-foreground">
          Case BPM:{" "}
          <span className="font-mono">{customer.workflowCaseId}</span>
        </span>
      ) : null}
    </div>
  )
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

export function Header({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <FileText className="size-5 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">{title}</h1>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </header>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const variant = status === "ACTIVE" || status === "APPROVED" ? "default" : "secondary"
  return <Badge variant={variant}>{status}</Badge>
}

export function EmptyTable({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="h-24 text-center text-muted-foreground"
      >
        {text}
      </TableCell>
    </TableRow>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
export function ContextField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="break-words font-mono text-xs">{value || "-"}</p>
    </div>
  )
}
