import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { navigateTo } from "@workspace/core/routing"
import { useI18n } from "@workspace/i18n"
import {
  ArrowLeft,
  Check,
  Plus,
  RotateCcw,
  Save,
  Send,
  X,
} from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { PageTitle } from "@workspace/ui/components/page-title"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import { GeoLocationFields } from "../geo-location-fields"
import { OrgUnitField } from "../org-unit-field"
import {
  useCancelAmendment,
  useCompleteWorkflowTask,
  useCurrentAmendment,
  useCustomer,
  useStartAdjustment,
  useSubmitAmendment,
  useUpdateAmendment,
} from "../queries"
import {
  businessFields,
  customerSchema,
  defaultValues,
  extendedFields,
  generalFieldsPrimary,
  generalFieldsRest,
  personalFields,
  type CustomerFormValues,
} from "../shared/schemas"
import {
  computeChangedFields,
  customerTypeLabel,
  toAmendmentSnapshot,
  toFormValues,
} from "../shared/form-utils"
import {
  hasTaskContext,
  isViewOnlyTaskContext,
  resolveWorkflowJobKey,
  type CustomerTaskContext,
  useCustomerTaskContext,
} from "../shared/task-context"
import {
  EmptyState,
  FieldGrid,
  Panel,
  RegistrationStatusBar,
  StatusBadge,
} from "../shared/ui"

function goBack() {
  const returnUrl = new URLSearchParams(window.location.search).get("returnUrl")
  if (returnUrl) {
    navigateTo(returnUrl)
  } else {
    window.history.back()
  }
}

function AdjustmentTabsList({ compact = false }: { compact?: boolean }) {
  return (
    <TabsList
      className={cn(
        "flex h-auto justify-start",
        compact
          ? "max-w-full flex-nowrap overflow-x-auto scrollbar-none"
          : "flex-wrap"
      )}
    >
      <TabsTrigger value="general">Thông tin khách hàng</TabsTrigger>
    </TabsList>
  )
}

export function CustomerAdjustmentPage({
  initialCustomerId,
}: {
  initialCustomerId?: string | null
}) {
  const { t } = useI18n()
  const { context: taskContext, isLoading: taskContextLoading } =
    useCustomerTaskContext()
  const customerId = (taskContext.customerId ?? initialCustomerId)?.trim() || ""
  const customerQuery = useCustomer(customerId || null)
  const amendmentQuery = useCurrentAmendment(customerId || null)
  const startAdjustment = useStartAdjustment()
  const updateAmendment = useUpdateAmendment(customerId)
  const submitAmendment = useSubmitAmendment(customerId)
  const cancelAmendment = useCancelAmendment(customerId)
  const completeTask = useCompleteWorkflowTask(taskContext.role)
  const viewOnly = isViewOnlyTaskContext()
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  })
  const customer = customerQuery.data ?? null
  const amendment = amendmentQuery.data ?? null
  const customerType = form.watch("customerType")
  const isPersonal = customerType === "PERSONAL"
  const readOnly = viewOnly || amendment?.status === "PENDING"
  const canEdit = amendment?.status === "DRAFT"
  const canSubmit = canEdit && Boolean(amendment?.id)
  const canCancelDraft = canEdit && Boolean(amendment?.id)
  const canStart =
    !viewOnly &&
    Boolean(customerId) &&
    customer?.status === "ACTIVE" &&
    !amendment &&
    !amendmentQuery.isFetching
  const awaitingAmendmentResubmit =
    amendment?.status === "DRAFT" && hasTaskContext(taskContext)
  const canCompleteTask =
    !viewOnly &&
    hasTaskContext(taskContext) &&
    taskContext.role !== "CUSTOMER_MAKER"
  const canEditTask =
    !viewOnly &&
    hasTaskContext(taskContext) &&
    taskContext.role === "CUSTOMER_MAKER"
  const isSubmitting =
    updateAmendment.isPending ||
    submitAmendment.isPending ||
    cancelAmendment.isPending ||
    completeTask.isPending ||
    startAdjustment.isPending
  const pageTitle = canEditTask
    ? "Chỉnh sửa điều chỉnh hồ sơ"
    : canCompleteTask
      ? "Phê duyệt điều chỉnh hồ sơ"
      : t("crm.customers.adjustments.title")
  const pageDescription = canEditTask
    ? "Cập nhật thông tin điều chỉnh theo yêu cầu của quy trình."
    : t("crm.customers.adjustments.description")

  useEffect(() => {
    if (!customer) return
    form.reset(toFormValues(customer))
  }, [customer, form])

  async function saveAdjustment(values: CustomerFormValues) {
    if (!amendment?.id) return
    const afterSnapshot = toAmendmentSnapshot(values)
    await updateAmendment.mutateAsync({
      amendmentId: amendment.id,
      payload: {
        afterSnapshot,
        changedFields: computeChangedFields(customer, afterSnapshot),
      },
    })
  }

  async function completeCurrentTask(decision: string) {
    const resolved = await resolveWorkflowJobKey(taskContext, customer?.status)
    if (!resolved) return
    const variables =
      resolved.role === "CUSTOMER_RISK_CHECKER"
        ? { riskDecision: decision }
        : resolved.role === "CUSTOMER_MAKER"
          ? { revisionSubmitted: true }
          : { reviewDecision: decision }
    await completeTask.mutateAsync({
      jobKey: resolved.jobKey,
      processInstanceKey: resolved.processInstanceKey,
      elementId: resolved.elementId,
      variables,
    })
    navigateTo(adjustmentIncomingHref(taskContext))
  }

  if (taskContextLoading) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]">
          <PageTitle title={pageTitle} description={pageDescription} />
          <div className="mt-4 rounded-md border px-4 py-3 text-sm text-muted-foreground">
            Đang tải ngữ cảnh giao dịch...
          </div>
        </div>
        <FooterBackButton onBack={goBack} />
      </section>
    )
  }

  if (!customerId) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 [scrollbar-gutter:stable]">
          <PageTitle title={pageTitle} description={pageDescription} />
          <EmptyState text="Thiếu customerId trên URL." />
        </div>
        <FooterBackButton onBack={goBack} />
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={form.handleSubmit((values) => saveAdjustment(values))}
      >
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          <Tabs defaultValue="general" className="flex flex-col">
            <div className="space-y-4 p-4 pb-3">
              <PageTitle
                title={pageTitle}
                description={pageDescription}
                meta={
                  customer ? (
                    <Badge className="shrink-0" variant="secondary">
                      {customer.status}
                    </Badge>
                  ) : null
                }
              />
            </div>
            <div className="sticky top-0 z-10 border-b bg-background px-4 py-2">
              <AdjustmentTabsList />
            </div>
            <div className="space-y-4 p-4">
              {customerQuery.isFetching || amendmentQuery.isFetching ? (
                <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
                  Đang tải hồ sơ...
                </div>
              ) : null}
              <RegistrationStatusBar customer={customer} />
              {amendment ? (
                <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
                  <span>
                    Phiên điều chỉnh:{" "}
                    <span className="font-mono font-medium">{amendment.id}</span>
                  </span>
                  <StatusBadge status={amendment.status} />
                  {amendment.changedFields?.length ? (
                    <span className="text-muted-foreground">
                      Trường đổi: {amendment.changedFields.join(", ")}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {awaitingAmendmentResubmit ? (
                <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                  {t("crm.customers.adjustments.resubmit_banner")}
                </div>
              ) : null}
              {readOnly ? (
                <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  {t("crm.customers.adjustments.pending_banner")}
                </div>
              ) : null}
              {canStart ? (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    disabled={startAdjustment.isPending}
                    onClick={() =>
                      startAdjustment.mutate(customerId, {
                        onSuccess: () =>
                          navigateTo(adjustmentIncomingHref(taskContext)),
                      })
                    }
                  >
                    <Plus className="size-4" />
                    {t("crm.customers.adjustments.start")}
                  </Button>
                </div>
              ) : null}
              {amendment ? (
                <TabsContent value="general" className="mt-0 space-y-4">
                  <fieldset disabled={readOnly} className="space-y-4">
                    <Panel title="Thông tin chung">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <FormField label="Loại khách hàng">
                          <Input
                            value={customerTypeLabel(customerType)}
                            readOnly
                          />
                        </FormField>
                        <OrgUnitField form={form} disabled={readOnly} />
                        <FieldGrid
                          fields={generalFieldsPrimary}
                          form={form}
                          bare
                        />
                        <GeoLocationFields form={form} />
                        <FieldGrid fields={generalFieldsRest} form={form} bare />
                      </div>
                    </Panel>
                    {isPersonal ? (
                      <>
                        <Panel title="Thông tin định danh">
                          <FieldGrid fields={personalFields} form={form} />
                        </Panel>
                        <Panel title="Thông tin mở rộng">
                          <FieldGrid fields={extendedFields} form={form} />
                        </Panel>
                      </>
                    ) : (
                      <Panel title="Thông tin doanh nghiệp">
                        <FieldGrid fields={businessFields} form={form} />
                      </Panel>
                    )}
                  </fieldset>
                </TabsContent>
              ) : null}
            </div>
          </Tabs>
        </div>
        <FooterActions
          viewOnly={viewOnly}
          isSubmitting={isSubmitting}
          canEdit={canEdit}
          canSubmit={canSubmit}
          canCancelDraft={canCancelDraft}
          canCompleteTask={canCompleteTask}
          canEditTask={canEditTask}
          onBack={goBack}
          onCompleteTask={completeCurrentTask}
          onSaveDraft={form.handleSubmit((values) => saveAdjustment(values))}
          onSaveAndComplete={form.handleSubmit(async (values) => {
            await saveAdjustment(values)
            if (!amendment?.id) return
            await submitAmendment.mutateAsync(amendment.id)
            if (canEditTask) {
              await completeCurrentTask("APPROVE")
            } else {
              navigateTo(adjustmentIncomingHref(taskContext))
            }
          })}
          onCancelDraft={() => {
            if (!amendment?.id) return
            cancelAmendment.mutate(amendment.id)
          }}
        />
      </form>
    </section>
  )
}

function FooterActions({
  viewOnly,
  isSubmitting,
  canEdit,
  canSubmit,
  canCancelDraft,
  canCompleteTask,
  canEditTask,
  onBack,
  onCompleteTask,
  onSaveDraft,
  onSaveAndComplete,
  onCancelDraft,
}: {
  viewOnly: boolean
  isSubmitting: boolean
  canEdit: boolean
  canSubmit: boolean
  canCancelDraft: boolean
  canCompleteTask: boolean
  canEditTask: boolean
  onBack: () => void
  onCompleteTask: (decision: string) => void
  onSaveDraft: () => void
  onSaveAndComplete: () => void
  onCancelDraft: () => void
}) {
  return (
    <div className="flex h-13 shrink-0 items-center border-t bg-background px-4">
      <div className="flex w-full flex-wrap justify-end gap-2">
        {viewOnly ? null : canCompleteTask ? (
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
        ) : canEditTask || canEdit ? (
          <>
            <Button
              className="h-8"
              type="button"
              disabled={!canSubmit || isSubmitting}
              onClick={onSaveAndComplete}
            >
              <Send className="size-4" />
              Hoàn thành
            </Button>
            <Button
              className="h-8"
              type="button"
              variant="secondary"
              disabled={!canEdit || isSubmitting}
              onClick={onSaveDraft}
            >
              <Save className="size-4" />
              Lưu chỉnh sửa
            </Button>
            {canCancelDraft ? (
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
        ) : null}
        <Button className="h-8" type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
      </div>
    </div>
  )
}

function FooterBackButton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-13 shrink-0 items-center justify-end border-t bg-background px-4">
      <Button className="h-8" type="button" variant="ghost" onClick={onBack}>
        <ArrowLeft className="size-4" />
        Quay lại
      </Button>
    </div>
  )
}

function adjustmentIncomingHref(context: CustomerTaskContext) {
  const code = context.caseCode?.trim()
  if (!code) return "/workbench/incoming-transactions"
  return `/workbench/incoming-transactions?caseCode=${encodeURIComponent(code)}`
}
