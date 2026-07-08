import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { navigateTo } from "@workspace/core/routing"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { ArrowLeft, Check, Save, Send, X } from "lucide-react"
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
import type { Customer, CustomerType } from "../api"
import { CustomerRegistrationTabsList } from "../components/registration-tabs-list"
import { RelationshipsPanel } from "../components/relationships-panel"
import { GeoLocationFields } from "../geo-location-fields"
import { OrgUnitField } from "../org-unit-field"
import {
  useCancelCustomer,
  useCompleteWorkflowTask,
  useCustomer,
  useSaveCustomer,
  useSubmitCustomer,
  useUploadCustomerAvatar,
} from "../queries"
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
  taskContextFromSearch,
} from "../shared/task-context"
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
  const taskContext = taskContextFromSearch()
  const saveCustomer = useSaveCustomer()
  const submitCustomer = useSubmitCustomer()
  const cancelCustomer = useCancelCustomer()
  const completeTask = useCompleteWorkflowTask(taskContext.role)
  const viewOnly = isViewOnlyTaskContext()
  const uploadAvatar = useUploadCustomerAvatar()
  const customerQuery = useCustomer(initialCustomerId ?? null)
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
  const needsChangesNoContext =
    awaitingMakerResubmit && !hasTaskContext(taskContext)
  const isReadonly = viewOnly || isActive || (isSubmitted && !canEditTask)
  const canCompleteTask =
    !viewOnly &&
    hasTaskContext(taskContext) &&
    taskContext.role !== "CUSTOMER_MAKER"
  const isSubmitting =
    form.formState.isSubmitting ||
    saveCustomer.isPending ||
    submitCustomer.isPending ||
    completeTask.isPending
  const submittingRef = useRef(false)

  // ── Auto-save draft ──────────────────────────────
  const draftKey = useMemo(() => {
    const cid = initialCustomerId ?? savedCustomer?.id
    return cid ? `crm_customer_draft:${cid}` : null
  }, [initialCustomerId, savedCustomer?.id])

  // Khôi phục draft từ localStorage hoặc từ API
  useEffect(() => {
    if (customerQuery.data) {
      form.reset(toFormValues(customerQuery.data))
      setSavedCustomer(customerQuery.data)
      // Xoá localStorage draft nếu có
      if (draftKey) localStorage.removeItem(draftKey)
      return
    }
    // Nếu chưa có customerId: khôi phục localStorage
    if (initialCustomerId) return // đang loading từ API
    const raw = localStorage.getItem("crm_customer_draft:new")
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<CustomerFormValues>
        form.reset({ ...defaultValues, ...parsed })
      } catch {
        /* ignore */
      }
    }
  }, [customerQuery.data, form, initialCustomerId, draftKey])

  // Auto-save khi form thay đổi (debounced)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoSaveDraft = useCallback(
    (values: CustomerFormValues) => {
      const cid = savedCustomer?.id
      // Luôn lưu localStorage
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
      // Xoá draft localStorage sau khi lưu thành công lên server
      localStorage.removeItem(`crm_customer_draft:${customer.id}`)
      localStorage.removeItem("crm_customer_draft:new")
    },
    [form]
  )

  async function saveAndSubmit(values: CustomerFormValues) {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      const saved = await saveCustomer.mutateAsync({
        payload: toPayload(values, savedCustomer?.id, savedCustomer?.status),
        quiet: true,
      })
      if (!saved.id) return
      refreshCustomer(saved)

      const params = new URLSearchParams(window.location.search)
      if (!params.has("customerId")) {
        params.set("customerId", saved.id)
        navigateTo(`/customers/registrations?${params.toString()}`)
      }

      const submitted = await submitCustomer.mutateAsync(saved.id)
      refreshCustomer(submitted)
      navigateTo(registrationIncomingHref(submitted))
    } finally {
      submittingRef.current = false
    }
  }

  async function saveAndCompleteTask(
    values: CustomerFormValues,
    _decision: string
  ) {
    if (submittingRef.current) return
    submittingRef.current = true
    try {
      const saved = await saveCustomer.mutateAsync({
        payload: toPayload(values, savedCustomer?.id, savedCustomer?.status),
        quiet: true,
      })
      refreshCustomer(saved)

      const resolved = await resolveWorkflowJobKey(taskContext, saved.status)
      if (!resolved) return
      completeTask.mutate({
        jobKey: resolved.jobKey,
        processInstanceKey: resolved.processInstanceKey,
        elementId: resolved.elementId,
        variables: { revisionSubmitted: true },
      })
    } finally {
      submittingRef.current = false
    }
  }

  function handleInvalid() {
    notify.error(
      "Chưa gửi được",
      "Vui lòng kiểm tra các trường bắt buộc (Tên khách hàng, Email hợp lệ...)."
    )
  }

  async function completeCurrentTask(decision: string) {
    const resolved = await resolveWorkflowJobKey(
      taskContext,
      savedCustomer?.status
    )
    if (!resolved) return
    const variables =
      resolved.role === "CUSTOMER_RISK_CHECKER"
        ? { riskDecision: decision }
        : { reviewDecision: decision }
    completeTask.mutate({
      jobKey: resolved.jobKey,
      processInstanceKey: resolved.processInstanceKey,
      elementId: resolved.elementId,
      variables,
    })
  }

  async function uploadAvatarFile(file: File) {
    const customerId = savedCustomer?.id ?? form.getValues("id")?.trim()
    if (!customerId) {
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
    const result = await uploadAvatar.mutateAsync({ file, customerId })
    form.setValue("avatarFileId", result.public_id, { shouldDirty: true })
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
        <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col">
          <div className="scrollbar-gutter-stable min-h-0 flex-1 overflow-y-auto">
            <div className="px-4 pt-4">
              <PageTitle
                title={t("crm.customers.registrations.title")}
                description={t("crm.customers.registrations.description")}
                meta={
                  savedCustomer ? (
                    <Badge className="shrink-0" variant="secondary">
                      {savedCustomer.status}
                    </Badge>
                  ) : null
                }
                actions={
                  <Button variant="ghost" size="sm" onClick={goBack}>
                    <ArrowLeft className="size-4" />
                    Quay lại
                  </Button>
                }
              />
            </div>
            <div className="sticky top-0 z-10 border-b bg-background px-4 pb-3">
              <CustomerRegistrationTabsList
                isPersonal={isPersonal}
                canAddRelationship={canAddRelationship}
              />
            </div>
            <div className="space-y-4 p-4">
              {customerQuery.isFetching ? (
                <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
                  Đang tải hồ sơ...
                </div>
              ) : null}
              <RegistrationStatusBar customer={savedCustomer} />
              {needsChangesNoContext ? (
                <div className="rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                  <p className="font-medium">Hồ sơ cần chỉnh sửa thông tin</p>
                  <p className="mt-1">
                    Quản lý yêu cầu chỉnh sửa. Mở từ{" "}
                    <strong>Workbench → Giao dịch đến</strong> để xem chi tiết.
                  </p>
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
                        uploading={uploadAvatar.isPending}
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
            onCompleteTask={completeCurrentTask}
            onCancel={() => {
              if (!savedCustomer?.id) return
              cancelCustomer.mutate(savedCustomer.id, {
                onSuccess: () => navigateTo("/workbench/drafts"),
              })
            }}
            onBack={goBack}
            onSaveDraft={form.handleSubmit(async (values) => {
              const saved = await saveCustomer.mutateAsync({
                payload: toPayload(
                  values,
                  savedCustomer?.id,
                  savedCustomer?.status
                ),
              })
              refreshCustomer(saved)
              const params = new URLSearchParams(window.location.search)
              if (!params.has("customerId")) {
                params.set("customerId", saved.id)
                navigateTo(`/customers/registrations?${params.toString()}`)
              }
            }, handleInvalid)}
            onSaveAndSubmit={form.handleSubmit(saveAndSubmit, handleInvalid)}
            onSaveAndRevise={form.handleSubmit(
              (values) => saveAndCompleteTask(values, "APPROVE"),
              handleInvalid
            )}
          />
        </Tabs>
      </form>
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
  onCompleteTask,
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
  onCompleteTask: (decision: string) => void
  onCancel: () => void
  onSaveDraft: () => void
  onSaveAndSubmit: () => void
  onSaveAndRevise: () => void
  onBack: () => void
}) {
  if (isReadonly && !canCompleteTask) return null

  return (
    <div className="flex h-13 shrink-0 items-center border-t bg-background px-4">
      <div className="flex w-full flex-wrap justify-end gap-2">
        {canCompleteTask ? (
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
              <X className="size-4" />
              Từ chối
            </Button>
            <Button className="h-8" type="button" variant="ghost" onClick={onBack}>
              <ArrowLeft className="size-4" />
              Quay lại
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
        {awaitingMakerResubmit || canEditTask ? (
          <Button className="h-8" type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Quay lại
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function registrationIncomingHref(customer: Customer | null) {
  const code = customer?.customerCode?.trim()
  if (!code) return "/workbench/incoming-transactions"
  return `/workbench/incoming-transactions?caseCode=${encodeURIComponent(code)}`
}
