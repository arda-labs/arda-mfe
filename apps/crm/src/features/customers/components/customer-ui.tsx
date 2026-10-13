import { useState, type ChangeEvent, type ReactNode } from "react"
import { Controller, type UseFormReturn } from "react-hook-form"
import { getMediaContentUrl } from "@workspace/media"
import { useI18n } from "@workspace/i18n"
import { Upload } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { ImageCropDialog } from "@workspace/ui/components/image-crop-dialog"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import { Textarea } from "@workspace/ui/components/textarea"
import type { Customer } from "../../api"
import { type CustomerFormValues } from "../schemas"
import { optionsFor } from "../utils/form-utils"
import { registrationStatusLabelKey } from "../utils/registration-status"

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
  const { t } = useI18n()
  const content = (
    <>
      {fields.map(([name, label, type]) => (
        <FormField
          key={name}
          label={t(label)}
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
                        {t(option.label)}
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

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{content}</div>
  )
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
  const { t } = useI18n()
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    // Route through the crop dialog; onUpload receives the cropped file.
    setPendingFile(file)
    event.target.value = ""
  }

  return (
    <div className="space-y-2">
      <div className="flex aspect-4/5 w-full items-center justify-center overflow-hidden rounded-md border bg-muted/30">
        {fileId ? (
          <img
            alt={t("crm.customers.avatar.alt")}
            className="h-full w-full object-cover"
            src={getMediaContentUrl(fileId)}
          />
        ) : (
          <div className="px-4 text-center text-sm text-muted-foreground">
            {t("crm.customers.avatar.placeholder")}
          </div>
        )}
      </div>
      <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted">
        <Upload className="size-4" />
        {uploading
          ? t("crm.customers.avatar.uploading")
          : t("crm.customers.avatar.upload")}
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
          {t("crm.customers.avatar.remove")}
        </Button>
      ) : null}
      <ImageCropDialog
        file={pendingFile}
        aspect={1}
        title={t("crm.customers.registrations.avatar_crop_title")}
        processing={uploading}
        onConfirm={(cropped) => {
          setPendingFile(null)
          void onUpload(cropped)
        }}
        onClose={() => setPendingFile(null)}
      />
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
    <div className="flex flex-col gap-3 rounded-md border border-info/30 bg-info/10 px-4 py-3 text-sm text-info sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p>{t("crm.customers.registrations.submitted_banner")}</p>
        {customer?.workflowCaseId ? (
          <p className="font-mono text-xs text-info">
            {t("crm.customers.case_bpm_label")} {customer.workflowCaseId}
          </p>
        ) : null}
      </div>
      <Button
        className="h-8 shrink-0"
        type="button"
        variant="secondary"
        onClick={onOpenWorkbench}
      >
        {t("crm.customers.registrations.submitted_open_workbench")}
      </Button>
    </div>
  )
}

export function RegistrationStatusBar({
  customer,
}: {
  customer: Customer | null
}) {
  const { t } = useI18n()
  const status = customer?.status
  if (!status) return null

  const config: Record<string, { classes: string }> = {
    DRAFT: { classes: "border-warning/30 bg-warning/10 text-warning-ink" },
    NEEDS_CHANGES: {
      classes: "border-warning/30 bg-warning/10 text-warning-ink",
    },
    SUBMITTED: { classes: "border-info/30 bg-info/10 text-info" },
    ACTIVE: { classes: "border-success/30 bg-success/10 text-success" },
    REJECTED: { classes: "border-destructive/30 bg-destructive/10 text-destructive" },
  }

  const c = config[status] ?? {
    classes: "border-muted bg-muted/30 text-muted-foreground",
  }
  const labelKey = registrationStatusLabelKey(status)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-background px-3 py-2 text-xs">
      <span
        className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-medium ${c.classes}`}
      >
        {labelKey ? t(labelKey) : status}
      </span>
      {customer.customerCode ? (
        <span className="text-muted-foreground">
          {t("crm.customers.profile_code_label")}{" "}
          <span className="font-mono font-semibold text-foreground">
            {customer.customerCode}
          </span>
        </span>
      ) : null}
      {customer.workflowCaseId ? (
        <span className="text-muted-foreground">
          {t("crm.customers.case_label")}{" "}
          <span className="font-mono">{customer.workflowCaseId}</span>
        </span>
      ) : null}
    </div>
  )
}

export function RegistrationMetaBar({
  customer,
}: {
  customer: Customer | null
}) {
  const { t } = useI18n()
  if (!customer?.customerCode) return null
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
      <span>
        {t("crm.customers.profile_code_label")}{" "}
        <span className="font-mono font-medium">{customer.customerCode}</span>
      </span>
      {customer.workflowCaseId ? (
        <span className="text-muted-foreground">
          {t("crm.customers.case_bpm_label")}{" "}
          <span className="font-mono">{customer.workflowCaseId}</span>
        </span>
      ) : null}
    </div>
  )
}

export function Panel({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

// Customer status pills are the shared StatusBadge (tone from the code).
export { StatusBadge } from "@workspace/ui/components/status-badge"

export function EmptyTable({
  colSpan,
  text,
}: {
  colSpan: number
  text: string
}) {
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
