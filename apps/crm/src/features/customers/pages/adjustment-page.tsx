import { useCallback, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { navigateTo } from "@workspace/ui/shell/routing"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { PageTitle } from "@workspace/ui/components/page-title"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import { GeoLocationFields } from "../components/geo-location-fields"
import { OrgUnitField } from "../components/org-unit-field"
import { customerApi, type Customer, type CustomerAmendment } from "../../api"
import {
  runMutation,
  computeChangedFields,
  customerTypeLabel,
  toAmendmentSnapshot,
  toFormValues,
} from "../utils/form-utils"
import {
  businessFields,
  customerSchema,
  defaultValues,
  extendedFields,
  generalFieldsPrimary,
  generalFieldsRest,
  personalFields,
  type CustomerFormValues,
} from "../schemas"
import {
  hasTaskContext,
  isViewOnlyTaskContext,
  resolveWorkflowJobKey,
  useCustomerTaskContext,
  workflowKey,
} from "../utils/task-context"
import { waitForTaskReady } from "../utils/workflow-transition"
import { postTaskWorkbenchHref } from "../utils/workbench-return"
import {
  EmptyState,
  FieldGrid,
  FooterActions,
  FooterBackButton,
  Panel,
  RegistrationStatusBar,
  StatusBadge,
} from "../components/customer-ui"

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
          ? "scrollbar-none max-w-full flex-nowrap overflow-x-auto"
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
  const viewOnly = isViewOnlyTaskContext()
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  })
  const customerType = form.watch("customerType")
  const isPersonal = customerType === "PERSONAL"

  // ── Local state ──
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerFetching, setCustomerFetching] = useState(false)
  const [customerError, setCustomerError] = useState<unknown>(null)
  const [amendment, setAmendment] = useState<CustomerAmendment | null>(null)
  const [amendmentFetching, setAmendmentFetching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [autoStarting, setAutoStarting] = useState(false)
  const [autoStartFailed, setAutoStartFailed] = useState(false)

  // ── Load customer ──
  useEffect(() => {
    if (!customerId) {
      setCustomer(null)
      setCustomerError(null)
      return
    }
    let cancelled = false
    setCustomerFetching(true)
    setCustomerError(null)
    customerApi
      .get(customerId)
      .then((data) => {
        if (!cancelled) setCustomer(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setCustomer(null)
          setCustomerError(err)
          notify.error(
            "Không tải được thông tin khách hàng",
            translateApiError(err)
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCustomerFetching(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId])

  // ── Load amendment ──
  const loadAmendment = useCallback(async () => {
    if (!customerId) {
      setAmendment(null)
      return
    }
    setAmendmentFetching(true)
    try {
      const data = await customerApi.getCurrentAmendment(customerId)
      setAmendment(data)
    } finally {
      setAmendmentFetching(false)
    }
  }, [customerId])

  useEffect(() => {
    void loadAmendment()
  }, [loadAmendment])

  const readOnly = viewOnly || amendment?.status === "PENDING"
  const canEdit = amendment?.status === "DRAFT"
  const canSubmit = canEdit && Boolean(amendment?.id)
  const canCancelDraft = canEdit && Boolean(amendment?.id)
  const canAutoStart =
    !viewOnly &&
    !autoStarting &&
    !autoStartFailed &&
    Boolean(customerId) &&
    customer?.status === "ACTIVE" &&
    !amendment?.id &&
    !amendmentFetching
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
    await runMutation(
      () =>
        customerApi.updateAmendment(customerId, amendment.id, {
          afterSnapshot,
          changedFields: computeChangedFields(customer, afterSnapshot),
        }),
      {
        success: "Đã lưu thay đổi điều chỉnh",
        error: "Lưu điều chỉnh thất bại",
      }
    )
  }

  async function completeCurrentTask(decision: string) {
    setIsSubmitting(true)
    try {
      const resolved = await resolveWorkflowJobKey(
        taskContext,
        customer?.status
      )
      if (!resolved) return
      const variables =
        resolved.role === "CUSTOMER_RISK_CHECKER"
          ? { riskDecision: decision }
          : resolved.role === "CUSTOMER_MAKER"
            ? { revisionSubmitted: true }
            : { reviewDecision: decision }
      await runMutation(
        () => customerApi.completeTask({ ...resolved, variables }),
        {
          success: "Đã hoàn tất task quy trình",
          error: "Hoàn tất task thất bại",
        }
      )
      navigateTo(postTaskWorkbenchHref())
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Auto-start adjustment when entering with customerId and no amendment ──
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (!canAutoStart || autoStartedRef.current) return
    autoStartedRef.current = true
    setAutoStarting(true)

    ;(async () => {
      try {
        const result = await customerApi.startAdjustment(customerId)

        const { ready, timedOut } = await waitForTaskReady({
          caseId: result.workflowCaseId,
          stepCode: "UT_MakerRevise",
          getReadiness: customerApi.getTaskReadiness.bind(customerApi),
          timeoutMs: 30_000,
        })
        setAutoStarting(false)

        if (!ready) {
          notify.warning(
            "Đang xử lý hồ sơ",
            timedOut
              ? "Hệ thống đang xử lý, vui lòng vào Giao dịch đến sau vài phút."
              : "Vui lòng vào Giao dịch đến để tiếp tục chỉnh sửa."
          )
          navigateTo(postTaskWorkbenchHref())
          return
        }

        navigateTo(await adjustmentMakerEditHref(result))
      } catch (error) {
        notify.error(t("crm:customers.adjustments.init_failed"), translateApiError(error))
        setAutoStarting(false)
        setAutoStartFailed(true)
      }
    })()
  }, [canAutoStart, customerId])

  async function handleSaveDraft(values: CustomerFormValues) {
    setIsSubmitting(true)
    try {
      await saveAdjustment(values)
      await loadAmendment()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSaveAndComplete(values: CustomerFormValues) {
    setIsSubmitting(true)
    try {
      await saveAdjustment(values)
      if (!amendment?.id) return
      await runMutation(
        () => customerApi.submitAmendment(customerId, amendment.id),
        {
          success: "Đã hoàn thành điều chỉnh",
          error: "Hoàn thành điều chỉnh thất bại",
        }
      )
      if (canEditTask) {
        await completeCurrentTask("APPROVE")
      } else {
        navigateTo(postTaskWorkbenchHref())
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCancelDraft() {
    if (!amendment?.id) return
    setIsSubmitting(true)
    try {
      await runMutation(
        () => customerApi.cancelAmendment(customerId, amendment.id),
        {
          success: "Đã hủy phiên điều chỉnh nháp",
          error: "Hủy điều chỉnh thất bại",
        }
      )
      await loadAmendment()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (taskContextLoading) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="[scrollbar-gutter-stable] min-h-0 flex-1 overflow-y-auto p-4">
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
        <div className="[scrollbar-gutter-stable] min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <PageTitle title={pageTitle} description={pageDescription} />
          <EmptyState text="Thiếu customerId trên URL." />
        </div>
        <FooterBackButton onBack={goBack} />
      </section>
    )
  }

  const isCustomerLoading = customerFetching && !customer
  const hasCustomerError = customerError !== null && !customer

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={form.handleSubmit((values) => handleSaveDraft(values))}
      >
        <div className="[scrollbar-gutter-stable] min-h-0 flex-1 overflow-y-auto">
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
              {isCustomerLoading ? (
                <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
                  Đang tải hồ sơ khách hàng...
                </div>
              ) : hasCustomerError ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Không tải được thông tin khách hàng. Vui lòng thử lại hoặc
                  kiểm tra customerId.
                </div>
              ) : null}

              <RegistrationStatusBar customer={customer} />

              {amendment ? (
                <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
                  <span>
                    Phiên điều chỉnh:{" "}
                    <span className="font-mono font-medium">
                      {amendment.id}
                    </span>
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
              {readOnly && amendment ? (
                <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  {t("crm.customers.adjustments.pending_banner")}
                </div>
              ) : null}

              {!customerFetching &&
              !hasCustomerError &&
              customer &&
              !amendment?.id &&
              !autoStarting &&
              !autoStartFailed ? (
                <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  {customer.status === "ACTIVE"
                    ? "Khách hàng này chưa có phiên điều chỉnh. Hệ thống sẽ tự động khởi tạo..."
                    : `Không thể bắt đầu điều chỉnh — trạng thái khách hàng là "${customer.status}".`}
                </div>
              ) : null}

              {autoStarting ? (
                <div className="flex flex-col items-center rounded-md border px-4 py-10 text-sm text-muted-foreground">
                  <div className="mx-auto mb-3 size-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
                  <p>Đang khởi tạo phiên điều chỉnh...</p>
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
                        <FieldGrid
                          fields={generalFieldsRest}
                          form={form}
                          bare
                        />
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
          isReadonly={readOnly}
          isSubmitting={isSubmitting}
          canEdit={canEdit}
          canSubmit={canSubmit}
          canCancelDraft={canCancelDraft}
          canCompleteTask={canCompleteTask}
          canEditTask={canEditTask}
          onBack={goBack}
          onCompleteTask={completeCurrentTask}
          onSaveDraft={form.handleSubmit((values) => handleSaveDraft(values))}
          onSaveAndComplete={form.handleSubmit(handleSaveAndComplete)}
          onCancelDraft={handleCancelDraft}
        />
      </form>
    </section>
  )
}

async function adjustmentMakerEditHref(
  amendment: CustomerAmendment
): Promise<string> {
  const caseId = amendment.workflowCaseId?.trim()
  if (!caseId) return postTaskWorkbenchHref()

  try {
    const wfCase = await customerApi.getWorkflowCase(caseId)
    const processInstanceKey = workflowKey(wfCase.processInstanceKey)
    if (!processInstanceKey) return postTaskWorkbenchHref()

    const params = new URLSearchParams({
      customerId: amendment.customerId,
      caseId,
      caseCode: wfCase.caseCode || "",
      processInstanceKey,
      elementId: "UT_MakerRevise",
      role: "CUSTOMER_MAKER",
      returnUrl: "/workbench/incoming-transactions",
    })
    return `/customers/adjustments?${params.toString()}`
  } catch {
    return postTaskWorkbenchHref()
  }
}
