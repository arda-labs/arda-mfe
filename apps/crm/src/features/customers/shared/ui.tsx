import type { ChangeEvent, ReactNode } from "react"
import { Controller, type UseFormReturn } from "react-hook-form"
import { getMediaContentUrl } from "@workspace/media"
import { useI18n } from "@workspace/i18n"
import { ArrowLeft, Check, FileText, RotateCcw, Save, Send, Upload, X } from "lucide-react"
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
import { registrationStatusLabelKey } from "./registration-status"

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

export function RegistrationStatusBar({ customer }: { customer: Customer | null }) {
  const { t } = useI18n()
  const status = customer?.status
  if (!status) return null

  const config: Record<string, { classes: string }> = {
    DRAFT: { classes: "border-amber-200 bg-amber-50 text-amber-700" },
    NEEDS_CHANGES: { classes: "border-orange-200 bg-orange-50 text-orange-700" },
    SUBMITTED: { classes: "border-sky-200 bg-sky-50 text-sky-700" },
    ACTIVE: { classes: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    REJECTED: { classes: "border-red-200 bg-red-50 text-red-700" },
  }

  const c = config[status] ?? { classes: "border-muted bg-muted/30 text-muted-foreground" }
  const labelKey = registrationStatusLabelKey(status)

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border bg-background px-3 py-2 text-xs">
      <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 font-medium ${c.classes}`}>
        {labelKey ? t(labelKey) : status}
      </span>
      {customer.customerCode ? (
        <span className="text-muted-foreground">
          Mã hồ sơ:{" "}
          <span className="font-mono font-semibold text-foreground">{customer.customerCode}</span>
        </span>
      ) : null}
      {customer.workflowCaseId ? (
        <span className="text-muted-foreground">
          Case: <span className="font-mono">{customer.workflowCaseId}</span>
        </span>
      ) : null}
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

export function FooterBackButton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-13 shrink-0 items-center justify-end border-t bg-background px-4">
      <Button className="h-8" type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Quay lại
      </Button>
    </div>
  )
}

export function FooterActions({
  isReadonly,
  isSubmitting,
  canCancelDraft,
  canCompleteTask,
  canEditTask,
  awaitingMakerResubmit = false,
  canEdit = false,
  canSubmit,
  onApprove,
  onRequestChanges,
  onReject,
  onCancel,
  onBack,
  onSaveDraft,
  onSaveAndSubmit,
  onSaveAndRevise,
  onSaveAndComplete,
  onCancelDraft,
  onCompleteTask,
}: {
  isReadonly: boolean
  isSubmitting: boolean
  canCancelDraft: boolean
  canCompleteTask: boolean
  canEditTask: boolean
  awaitingMakerResubmit?: boolean
  canEdit?: boolean
  canSubmit?: boolean
  onApprove?: () => void
  onRequestChanges?: () => void
  onReject?: () => void
  onCancel?: () => void
  onBack: () => void
  onSaveDraft: () => void
  onSaveAndSubmit?: () => void
  onSaveAndRevise?: () => void
  onSaveAndComplete?: () => void
  onCancelDraft?: () => void
  onCompleteTask?: (decision: string) => void
}) {
  const showMakerActions =
    (canEditTask || awaitingMakerResubmit || canEdit) && !canCompleteTask
  const showCheckerActions = canCompleteTask && !isReadonly

  return (
    <div className="flex h-13 shrink-0 items-center border-t bg-background px-4">
      <div className="flex w-full flex-wrap justify-end gap-2">
        {showCheckerActions && (onApprove || onCompleteTask) ? (
          onCompleteTask ? (
            <>
              <Button
                className="h-8"
                type="button"
                disabled={isSubmitting}
                onClick={() => onCompleteTask("APPROVE")}
              >
                <Check className="size-4" />
                Phê duyệt
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onCompleteTask("REQUEST_CHANGES")}
              >
                <RotateCcw className="size-4" />
                Yêu cầu chỉnh sửa
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                onClick={() => onCompleteTask("REJECT")}
              >
                <X className="size-4" />
                Từ chối
              </Button>
            </>
          ) : (
            <>
              <Button
                className="h-8"
                type="button"
                disabled={isSubmitting}
                onClick={onApprove}
              >
                <Check className="size-4" />
                Phê duyệt
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={onRequestChanges}
              >
                <RotateCcw className="size-4" />
                Yêu cầu chỉnh sửa
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="destructive"
                disabled={isSubmitting}
                onClick={onReject}
              >
                <X className="size-4" />
                Từ chối
              </Button>
            </>
          )
        ) : null}

        {!isReadonly && !showCheckerActions ? (
          showMakerActions ? (
            <>
              <Button
                className="h-8"
                type="button"
                disabled={isSubmitting || (canSubmit != null && !canSubmit)}
                onClick={onSaveAndRevise ?? onSaveAndComplete}
              >
                <Send className="size-4" />
                Hoàn thành
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={onSaveDraft}
              >
                <Save className="size-4" />
                Lưu nháp
              </Button>
              {canCancelDraft && onCancelDraft ? (
                <Button
                  className="h-8"
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={onCancelDraft}
                >
                  <X className="size-4" />
                  Hủy nháp
                </Button>
              ) : null}
            </>
          ) : onSaveAndSubmit ? (
            <Button
              className="h-8"
              type="button"
              disabled={isSubmitting}
              onClick={onSaveAndSubmit}
            >
              <Send className="size-4" />
              Khởi tạo
            </Button>
          ) : null
        ) : null}

        {canCancelDraft && onCancel ? (
          <Button
            className="h-8"
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            <X className="size-4" />
            Hủy hồ sơ
          </Button>
        ) : null}

        <Button className="h-8" type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
      </div>
    </div>
  )
}
