import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { navigateTo } from "@workspace/core/routing"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { uploadFile } from "@workspace/media"
import { ArrowLeft, Check, RotateCcw, Save, Send, X } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Tabs, TabsContent } from "@workspace/ui/components/tabs"
import { PageTitle } from "@workspace/ui/components/page-title"
import type { Customer, CustomerPayload, CustomerType, WorkflowTimelineEvent } from "../api"
import { customerApi } from "../api"
import {
  CheckerDecisionDialog,
  type CheckerDecision,
} from "../components/checker-decision-dialog"
import { CustomerRegistrationTabsList } from "../components/registration-tabs-list"
import { RelationshipsPanel } from "../components/relationships-panel"
import { GeoLocationFields } from "../geo-location-fields"
import { OrgUnitField } from "../org-unit-field"
import { runMutation } from "../shared/form-utils"
import {
  businessFields,
  customerSchema,
  defaultValues,
  extendedFields,
  generalFieldsPrimary,
  generalFieldsRest,
  personalFields,
  selectOptions,
  type CustomerFormValues,
} from "../shared/schemas"
import { toFormValues, toPayload } from "../shared/form-utils"
import {
  hasTaskContext,
  isViewOnlyTaskContext,
  resolveWorkflowJobKey,
  useCustomerTaskContext,
  workflowKey,
} from "../shared/task-context"
import { postTaskWorkbenchHref } from "../shared/workbench-return"
import { waitForWorkflowStepChange } from "../shared/workflow-transition"
import {
  AvatarUploader,
  FieldGrid,
  Panel,
  RegistrationStatusBar,
} from "../shared/ui"

function goBack() {
  const returnUrl = new URLSearchParams(window.location.search).get("returnUrl")
  if (returnUrl) {
    navigateTo(returnUrl)
  } else {
    window.history.back()
  }
}

export function CustomerRegistrationPage({
  initialCustomerId,
}: {
  initialCustomerId?: string | null
}) {
  const { t } = useI18n()
  const [savedCustomer, setSavedCustomer] = useState<Customer | null>(null)
  const {
    context: taskContext,
    hasWorkItemId,
    isError: taskContextError,
    isLoading: taskContextLoading,
  } = useCustomerTaskContext()
  const customerId = taskContext.customerId ?? initialCustomerId ?? null
  const [checkerDecision, setCheckerDecision] = useState<Exclude<
    CheckerDecision,
    "APPROVE"
  > | null>(null)
  const viewOnly = isViewOnlyTaskContext()
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  })
  const customerType = form.watch("customerType")
  const isPersonal = customerType === "PERSONAL"
  const canAddRelationship = isPersonal && !!savedCustomer?.id
  const isSubmitted = savedCustomer?.status === "SUBMITTED"
  const isActive = savedCustomer?.status === "ACTIVE"
  const canEditTask =
    !viewOnly &&
    hasTaskContext(taskContext) &&
    taskContext.role === "CUSTOMER_MAKER"
  const canCancelDraft =
    savedCustomer?.status === "DRAFT" ||
    savedCustomer?.status === "NEEDS_CHANGES"
  const awaitingMakerResubmit = savedCustomer?.status === "NEEDS_CHANGES"
  const isReadonly = viewOnly || isActive || (isSubmitted && !canEditTask)
  const canCompleteTask =
    !viewOnly &&
    hasTaskContext(taskContext) &&
    taskContext.role !== "CUSTOMER_MAKER"
  const pageTitle = canEditTask
    ? "Chỉnh sửa hồ sơ khách hàng"
    : canCompleteTask
      ? "Phê duyệt hồ sơ khách hàng"
      : t("crm.customers.registrations.title")
  const pageDescription = viewOnly
    ? t("crm.customers.registrations.outgoing_tracking_description")
    : canEditTask
      ? "Cập nhật thông tin khách hàng theo yêu cầu của quy trình."
      : t("crm.customers.registrations.description")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const submittingRef = useRef(false)

  // ── Load customer data ──
  const [customerFetching, setCustomerFetching] = useState(false)
  useEffect(() => {
    if (!customerId) {
      setSavedCustomer(null)
      return
    }
    let cancelled = false
    setCustomerFetching(true)
    customerApi
      .get(customerId)
      .then((data) => {
        if (!cancelled) {
          setSavedCustomer(data)
          form.reset(toFormValues(data))
        }
      })
      .catch(() => {
        if (!cancelled) setSavedCustomer(null)
      })
      .finally(() => {
        if (!cancelled) setCustomerFetching(false)
      })
    return () => {
      cancelled = true
    }
  }, [customerId, form])

  const loadingInitialCustomer =
    taskContextLoading ||
    (hasWorkItemId && !customerId && !taskContextError) ||
    (customerFetching && !savedCustomer)

  // ── Case timeline ──
  const [timelineEvents, setTimelineEvents] = useState<WorkflowTimelineEvent[]>([])
  const timelineCaseId = awaitingMakerResubmit
    ? (taskContext.caseId ?? savedCustomer?.workflowCaseId ?? null)
    : null
  useEffect(() => {
    if (!timelineCaseId) {
      setTimelineEvents([])
      return
    }
    let cancelled = false
    customerApi
      .getWorkflowCaseTimeline(timelineCaseId)
      .then((events) => {
        if (!cancelled) setTimelineEvents(events)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [timelineCaseId])

  const latestRequestChangesNote = useMemo(() => {
    for (let i = timelineEvents.length - 1; i >= 0; i -= 1) {
      if (
        timelineEvents[i]?.eventType === "CHECKER_REQUEST_CHANGES" &&
        timelineEvents[i]?.note
      ) {
        return timelineEvents[i].note
      }
    }
    return ""
  }, [timelineEvents])

  // ── Auto-save draft ──────────────────────────────
  const draftKey = useMemo(() => {
    const cid = customerId ?? savedCustomer?.id
    return cid ? `crm_customer_draft:${cid}` : null
  }, [customerId, savedCustomer?.id])

  // Khôi phục draft từ localStorage hoặc từ API
  useEffect(() => {
    // Data loaded by the customerId effect above already resets the form.
    // For new customers (no customerId), restore from localStorage.
    if (taskContextLoading || hasWorkItemId || customerId || savedCustomer) return
    const raw = localStorage.getItem("crm_customer_draft:new")
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<CustomerFormValues>
        form.reset({ ...defaultValues, ...parsed })
      } catch {
        /* ignore */
      }
    }
  }, [customerId, draftKey, form, hasWorkItemId, savedCustomer, taskContextLoading])

  // Auto-save khi form thay đổi (debounced)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveDraft = useCallback(
    (values: CustomerFormValues) => {
      const cid = savedCustomer?.id
      const storageKey = cid
        ? `crm_customer_draft:${cid}`
        : "crm_customer_draft:new"
      localStorage.setItem(storageKey, JSON.stringify(values))
    },
    [savedCustomer?.id]
  )
  // Watch form để auto-save (debounced 2s)
  const formValues = form.watch()
  useEffect(() => {
    if (isReadonly) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveDraft(formValues)
    }, 2000)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [formValues, autoSaveDraft, isReadonly])

  const refreshCustomer = useCallback(
    (customer: Customer) => {
      setSavedCustomer(customer)
      form.reset(toFormValues(customer))
      localStorage.removeItem(`crm_customer_draft:${customer.id}`)
      localStorage.removeItem("crm_customer_draft:new")
    },
    [form]
  )

  async function saveDraft(payload: CustomerPayload) {
    return customerApi.save(payload)
  }

  async function saveDraftWithToast(payload: CustomerPayload) {
    return runMutation(() => customerApi.save(payload), {
      success: "Đã lưu nháp",
      error: "Lưu hồ sơ khách hàng thất bại",
      description: (customer) =>
        customer.customerCode
          ? `Mã hồ sơ: ${customer.customerCode}. Tiếp theo: chỉnh sửa hồ sơ rồi bấm Hoàn thành.`
          : "Tiếp theo: chỉnh sửa hồ sơ rồi bấm Hoàn thành.",
    })
  }

  async function saveAndSubmit(values: CustomerFormValues) {
    if (submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const saved = await saveDraft(
        toPayload(values, savedCustomer?.id, savedCustomer?.status)
      )
      if (!saved.id) return
      refreshCustomer(saved)

      const params = new URLSearchParams(window.location.search)
      if (!params.has("customerId")) {
        params.set("customerId", saved.id)
        navigateTo(`/customers/registrations?${params.toString()}`)
      }

      const submitted = await runMutation(() => customerApi.submit(saved.id), {
        success: "Đã khởi tạo hồ sơ khách hàng",
        error: "Khởi tạo hồ sơ thất bại",
        description: (customer) => {
          const caseHint = customer.workflowCaseId
            ? `Case BPM: ${customer.workflowCaseId}. `
            : ""
          return `${caseHint}Tiếp tục chỉnh sửa hồ sơ rồi bấm Hoàn thành.`
        },
      })
      refreshCustomer(submitted)
      navigateTo(await registrationMakerEditHref(submitted))
    } finally {
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }

  async function completeWorkflowTask(input: {
    jobKey: string
    processInstanceKey: string
    elementId: string
    variables: Record<string, unknown>
  }) {
    return runMutation(() => customerApi.completeTask(input), {
      success: "Đã hoàn tất task quy trình",
      error: "Hoàn tất task thất bại",
    })
  }

  async function saveAndCompleteTask(values: CustomerFormValues) {
    if (submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    try {
      const saved = await saveDraft(
        toPayload(values, savedCustomer?.id, savedCustomer?.status)
      )
      refreshCustomer(saved)

      const resolved = await resolveWorkflowJobKey(taskContext, saved.status)
      if (!resolved) return
      await completeWorkflowTask({
        jobKey: resolved.jobKey,
        processInstanceKey: resolved.processInstanceKey,
        elementId: resolved.elementId,
        variables: { revisionSubmitted: true },
      })
      await waitForWorkflowStepChange({
        caseId: taskContext.caseId ?? saved.workflowCaseId,
        completedElementId: resolved.elementId,
        loadCase: customerApi.getWorkflowCase,
      })
      navigateTo(postTaskWorkbenchHref())
    } finally {
      setIsSubmitting(false)
      submittingRef.current = false
    }
  }

  function handleInvalid() {
    notify.error(
      "Chưa gửi được",
      "Vui lòng kiểm tra các trường bắt buộc (Tên khách hàng, Email hợp lệ...)."
    )
  }

  async function completeCurrentTask(
    decision: CheckerDecision,
    comment?: string
  ) {
    setIsSubmitting(true)
    try {
      const resolved = await resolveWorkflowJobKey(
        taskContext,
        savedCustomer?.status
      )
      if (!resolved) return
      const variables =
        resolved.role === "CUSTOMER_RISK_CHECKER"
          ? {
              riskDecision: decision,
              ...(comment ? { reviewComment: comment } : {}),
            }
          : {
              reviewDecision: decision,
              ...(comment ? { reviewComment: comment } : {}),
            }
      await completeWorkflowTask({
        jobKey: resolved.jobKey,
        processInstanceKey: resolved.processInstanceKey,
        elementId: resolved.elementId,
        variables,
      })
      setCheckerDecision(null)
      navigateTo(postTaskWorkbenchHref())
    } finally {
      setIsSubmitting(false)
    }
  }

  function requestCheckerDecision(
    decision: Exclude<CheckerDecision, "APPROVE">
  ) {
    setCheckerDecision(decision)
  }

  async function uploadAvatarFile(file: File) {
    const cid = savedCustomer?.id ?? form.getValues("id")?.trim()
    if (!cid) {
      notify.error("Lưu hồ sơ trước khi upload ảnh đại diện")
      return
    }
    if (!file.type.startsWith("image/")) {
      notify.error("File ảnh không hợp lệ")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error("Ảnh đại diện tối đa 5MB")
      return
    }
    setUploadingAvatar(true)
    try {
      const result = await runMutation(
        () => uploadFile(file, "crm", "customer_avatar", cid),
        {
          success: "Đã tải ảnh đại diện lên media-service",
          error: "Tải ảnh đại diện thất bại",
        }
      )
      form.setValue("avatarFileId", result.public_id, { shouldDirty: true })
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleCancel() {
    if (!savedCustomer?.id) return
    await runMutation(() => customerApi.cancel(savedCustomer.id), {
      success: "Đã hủy hồ sơ nháp",
      error: "Hủy hồ sơ thất bại",
    })
    navigateTo("/workbench/drafts")
  }

  async function handleSaveDraft(values: CustomerFormValues) {
    setIsSubmitting(true)
    try {
      const saved = await saveDraftWithToast(
        toPayload(values, savedCustomer?.id, savedCustomer?.status)
      )
      refreshCustomer(saved)
      const params = new URLSearchParams(window.location.search)
      if (!params.has("customerId")) {
        params.set("customerId", saved.id)
        navigateTo(`/customers/registrations?${params.toString()}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loadingInitialCustomer || taskContextError) {
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]">
          <PageTitle title={pageTitle} description={pageDescription} />
          <div className="mt-4 rounded-md border px-4 py-3 text-sm text-muted-foreground">
            {taskContextError
              ? "Khong tai duoc thong tin task. Vui long quay lai Giao dich den va mo lai ho so."
              : "Dang tai ho so..."}
          </div>
        </div>
        <FooterBackButton onBack={goBack} />
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={form.handleSubmit(
          (values) => saveAndSubmit(values),
          handleInvalid
        )}
      >
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          <Tabs defaultValue="general" className="flex flex-col">
            <div className="space-y-4 p-4 pb-3">
              <PageTitle
                title={pageTitle}
                description={pageDescription}
                meta={
                  savedCustomer ? (
                    <Badge className="shrink-0" variant="secondary">
                      {savedCustomer.status}
                    </Badge>
                  ) : null
                }
              />
            </div>
            <div className="sticky top-0 z-10 border-b bg-background px-4 py-2">
              <CustomerRegistrationTabsList
                isPersonal={isPersonal}
                canAddRelationship={canAddRelationship}
              />
            </div>
            <div className="space-y-4 p-4">
              {customerFetching ? (
                <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
                  Đang tải hồ sơ...
                </div>
              ) : null}
              <RegistrationStatusBar customer={savedCustomer} />
              {awaitingMakerResubmit ? (
                <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                  <p className="font-medium">
                    {t(
                      "crm.customers.registrations.needs_changes_banner_title"
                    )}
                  </p>
                  {latestRequestChangesNote ? (
                    <p className="mt-1">
                      <span className="font-medium">
                        {t(
                          "crm.customers.registrations.needs_changes_reason_label"
                        )}
                        :{" "}
                      </span>
                      {latestRequestChangesNote}
                    </p>
                  ) : (
                    <p className="mt-1">
                      {t(
                        "crm.customers.registrations.needs_changes_banner_fallback"
                      )}
                    </p>
                  )}
                </div>
              ) : null}
              <TabsContent value="general" className="mt-0 space-y-4">
                <fieldset disabled={isReadonly} className="space-y-4">
                  <Panel title="Thông tin chung">
                    <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
                      <div className="space-y-3">
                        <FormField label="Loại khách hàng">
                          <Controller
                            control={form.control}
                            name="customerType"
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={(value) =>
                                  field.onChange(value as CustomerType)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {selectOptions.customerType.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormField>
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <OrgUnitField form={form} />
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
                      </div>
                      <AvatarUploader
                        fileId={form.watch("avatarFileId")}
                        uploading={uploadingAvatar}
                        onClear={() =>
                          form.setValue("avatarFileId", "", {
                            shouldDirty: true,
                          })
                        }
                        onUpload={uploadAvatarFile}
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
              {isPersonal ? (
                <TabsContent value="relationships" className="mt-0">
                  {savedCustomer ? (
                    <RelationshipsPanel customer={savedCustomer} />
                  ) : (
                    <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                      Gửi hồ sơ khách hàng trước khi khai báo người có liên
                      quan.
                    </div>
                  )}
                </TabsContent>
              ) : null}
            </div>
          </Tabs>
        </div>
        <FooterActions
          isReadonly={isReadonly}
          isSubmitting={isSubmitting}
          canCancelDraft={canCancelDraft}
          canCompleteTask={canCompleteTask}
          canEditTask={canEditTask}
          awaitingMakerResubmit={
            awaitingMakerResubmit && hasTaskContext(taskContext)
          }
          onApprove={() => completeCurrentTask("APPROVE")}
          onRequestChanges={() => requestCheckerDecision("REQUEST_CHANGES")}
          onReject={() => requestCheckerDecision("REJECT")}
          onCancel={handleCancel}
          onBack={goBack}
          onSaveDraft={form.handleSubmit(handleSaveDraft, handleInvalid)}
          onSaveAndSubmit={form.handleSubmit(saveAndSubmit, handleInvalid)}
          onSaveAndRevise={form.handleSubmit(
            saveAndCompleteTask,
            handleInvalid
          )}
        />
      </form>
      <CheckerDecisionDialog
        decision={checkerDecision}
        open={checkerDecision != null}
        submitting={isSubmitting}
        onOpenChange={(open) => {
          if (!open) setCheckerDecision(null)
        }}
        onConfirm={(comment) => {
          if (!checkerDecision) return
          void completeCurrentTask(checkerDecision, comment)
        }}
      />
    </section>
  )
}

function FooterActions({
  isReadonly,
  isSubmitting,
  canCancelDraft,
  canCompleteTask,
  canEditTask,
  awaitingMakerResubmit,
  onApprove,
  onRequestChanges,
  onReject,
  onCancel,
  onSaveDraft,
  onSaveAndSubmit,
  onSaveAndRevise,
  onBack,
}: {
  isReadonly: boolean
  isSubmitting: boolean
  canCancelDraft: boolean
  canCompleteTask: boolean
  canEditTask: boolean
  awaitingMakerResubmit: boolean
  onApprove: () => void
  onRequestChanges: () => void
  onReject: () => void
  onCancel: () => void
  onSaveDraft: () => void
  onSaveAndSubmit: () => void
  onSaveAndRevise: () => void
  onBack: () => void
}) {
  return (
    <div className="flex h-13 shrink-0 items-center border-t bg-background px-4">
      <div className="flex w-full flex-wrap justify-end gap-2">
        {isReadonly && !canCompleteTask ? null : canCompleteTask ? (
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
        ) : awaitingMakerResubmit || canEditTask ? (
          <>
            <Button
              className="h-8"
              type="button"
              disabled={isSubmitting}
              onClick={onSaveAndRevise}
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
          </>
        ) : (
          <Button
            className="h-8"
            type="button"
            disabled={isSubmitting}
            onClick={onSaveAndSubmit}
          >
            <Send className="size-4" />
            Khởi tạo
          </Button>
        )}
        {canCancelDraft ? (
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

function registrationIncomingHref(customer: Customer | null) {
  return registrationWorkbenchHref(customer, "incoming")
}

function registrationWorkbenchHref(
  customer: Customer | null,
  direction: "incoming" | "outgoing"
) {
  const path = `/workbench/${direction}-transactions`
  const code = customer?.customerCode?.trim()
  if (!code) return path
  return `${path}?caseCode=${encodeURIComponent(code)}`
}

/** After khởi tạo: open maker edit screen directly (skip workbench click). */
async function registrationMakerEditHref(customer: Customer) {
  const caseId = customer.workflowCaseId?.trim()
  if (!caseId) return registrationIncomingHref(customer)

  try {
    const wfCase = await customerApi.getWorkflowCase(caseId)
    const processInstanceKey = workflowKey(wfCase.processInstanceKey)
    if (!processInstanceKey) return registrationIncomingHref(customer)

    const params = new URLSearchParams({
      customerId: customer.id,
      caseId,
      caseCode: wfCase.caseCode || customer.customerCode,
      processInstanceKey,
      elementId: "UT_MakerRevise",
      role: "CUSTOMER_MAKER",
      returnUrl: "/workbench/incoming-transactions",
    })
    return `/customers/registrations?${params.toString()}`
  } catch {
    return registrationIncomingHref(customer)
  }
}