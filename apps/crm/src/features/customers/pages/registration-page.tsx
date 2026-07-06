import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { navigateTo } from "@workspace/core/routing"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { Save, Send, X } from "lucide-react"
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
import { CurrentTaskPanel } from "../components/task-panel"
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
  resolveWorkflowJobKey,
  taskContextFromSearch,
} from "../shared/task-context"
import {
  AvatarUploader,
  EmptyState,
  FieldGrid,
  Panel,
  RegistrationMetaBar,
  RegistrationFlowBar,
  RegistrationSubmittedBanner,
} from "../shared/ui"

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
  const uploadAvatar = useUploadCustomerAvatar()
  const customerQuery = useCustomer(initialCustomerId ?? null)
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  })
  const customerType = form.watch("customerType")
  const isPersonal = customerType === "PERSONAL"
  const canAddRelationship = isPersonal && savedCustomer?.status === "ACTIVE"
  const canSubmitDraft = savedCustomer?.status === "DRAFT"
  const isSubmitted = savedCustomer?.status === "SUBMITTED"
  const isActive = savedCustomer?.status === "ACTIVE"
  const canCancelDraft =
    savedCustomer?.status === "DRAFT" || savedCustomer?.status === "NEEDS_CHANGES"
  const awaitingMakerResubmit = savedCustomer?.status === "NEEDS_CHANGES"

  useEffect(() => {
    if (!customerQuery.data) return
    form.reset(toFormValues(customerQuery.data))
    setSavedCustomer(customerQuery.data)
  }, [customerQuery.data, form])

  async function save(values: CustomerFormValues, submit = false) {
    const wasNew = !savedCustomer?.id
    const saved = await saveCustomer.mutateAsync({
      payload: toPayload(values, savedCustomer?.id, savedCustomer?.status),
      quiet: submit,
    })
    setSavedCustomer(saved)
    form.reset(toFormValues(saved))
    if (wasNew && saved.id) {
      const params = new URLSearchParams(window.location.search)
      params.set("customerId", saved.id)
      navigateTo(`/customers/registrations?${params.toString()}`)
    }
    if (submit) {
      const submitted = await submitCustomer.mutateAsync(saved.id)
      setSavedCustomer(submitted)
      form.reset(toFormValues(submitted))
      navigateTo(registrationOutgoingHref(submitted))
    }
  }

  function handleInvalidSave() {
    notify.error(
      "Không lưu được",
      "Vui lòng kiểm tra các trường bắt buộc (Tên khách hàng, Email hợp lệ...)."
    )
  }

  async function completeCurrentTask(decision: string) {
    const resolved = await resolveWorkflowJobKey(taskContext, savedCustomer?.status)
    if (!resolved) return
    const variables =
      resolved.role === "CUSTOMER_RISK_CHECKER"
        ? { riskDecision: decision }
        : resolved.role === "CUSTOMER_MAKER"
          ? { revisionSubmitted: true }
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
      notify.error("Lưu nháp hồ sơ trước khi upload ảnh đại diện")
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
        onSubmit={form.handleSubmit((values) => save(values), handleInvalidSave)}
      >
        <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
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
              />
            </div>
            <div className="sticky top-0 z-10 border-b bg-background px-4 pb-3">
              <CustomerRegistrationTabsList
                isPersonal={isPersonal}
                canAddRelationship={canAddRelationship}
              />
            </div>
            <div className="space-y-4 p-4">
              {awaitingMakerResubmit ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Hồ sơ cần bổ sung. Lưu thay đổi rồi dùng nút <strong>Gửi lại</strong> trong
                  panel việc BPM (không dùng Trình duyệt).
                </div>
              ) : null}
              {isSubmitted ? (
                <RegistrationSubmittedBanner
                  customer={savedCustomer}
                  onOpenWorkbench={() =>
                    navigateTo(registrationOutgoingHref(savedCustomer))
                  }
                  t={t}
                />
              ) : null}
              {isActive ? (
                <div className="flex flex-col gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Hồ sơ đã kích hoạt (ACTIVE). Tra cứu tại{" "}
                    <strong>Khách hàng → Hồ sơ khách hàng</strong>.
                    {hasTaskContext(taskContext)
                      ? " Case BPM có thể còn bước hậu kỳ — bỏ qua panel duyệt bên dưới."
                      : ""}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => navigateTo("/customers/profiles")}
                  >
                    Mở hồ sơ khách hàng
                  </Button>
                </div>
              ) : null}
              {customerQuery.isFetching ? (
                <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
                  Đang tải hồ sơ...
                </div>
              ) : null}
              <RegistrationMetaBar customer={savedCustomer} />
              <RegistrationFlowBar customer={savedCustomer} />
              {!isActive ? (
                <CurrentTaskPanel
                  context={taskContext}
                  completing={completeTask.isPending}
                  onComplete={completeCurrentTask}
                />
              ) : null}
              <TabsContent value="general" className="mt-0 space-y-4">
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
                        <FieldGrid fields={generalFieldsPrimary} form={form} bare />
                        <GeoLocationFields form={form} />
                        <FieldGrid fields={generalFieldsRest} form={form} bare />
                      </div>
                    </div>
                    <AvatarUploader
                      fileId={form.watch("avatarFileId")}
                      uploading={uploadAvatar.isPending}
                      onClear={() =>
                        form.setValue("avatarFileId", "", { shouldDirty: true })
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
              </TabsContent>
              {isPersonal ? (
                <TabsContent value="relationships" className="mt-0">
                  {savedCustomer ? (
                    <RelationshipsPanel customer={savedCustomer} />
                  ) : (
                    <EmptyState text="Lưu và hoàn thành hồ sơ khách hàng trước khi khai báo người có liên quan." />
                  )}
                </TabsContent>
              ) : null}
            </div>
          </div>
          <div className="flex h-[52px] shrink-0 items-center border-t bg-background px-4">
            <div className="flex w-full flex-wrap justify-end gap-2">
              <Button
                className="h-8"
                type="submit"
                disabled={
                  isSubmitted ||
                  isActive ||
                  form.formState.isSubmitting ||
                  saveCustomer.isPending
                }
              >
                <Save className="size-4" />
                Lưu nháp
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="secondary"
                disabled={
                  isSubmitted ||
                  isActive ||
                  !savedCustomer?.id ||
                  form.formState.isSubmitting ||
                  saveCustomer.isPending ||
                  submitCustomer.isPending ||
                  !canSubmitDraft
                }
                onClick={form.handleSubmit(
                  (values) => save(values, true),
                  handleInvalidSave
                )}
              >
                <Send className="size-4" />
                Trình duyệt
              </Button>
              <Button
                className="h-8"
                type="button"
                variant="outline"
                disabled={
                  !savedCustomer?.id ||
                  cancelCustomer.isPending ||
                  !canCancelDraft
                }
                onClick={() => {
                  if (!savedCustomer?.id) return
                  cancelCustomer.mutate(savedCustomer.id, {
                    onSuccess: () => {
                      navigateTo("/workbench/drafts")
                    },
                  })
                }}
              >
                <X className="size-4" />
                {t("crm.customers.adjustments.cancel_draft")}
              </Button>
            </div>
          </div>
        </Tabs>
      </form>
    </section>
  )
}

function registrationOutgoingHref(customer: Customer | null) {
  const code = customer?.customerCode?.trim()
  if (!code) return "/workbench/outgoing-transactions"
  return `/workbench/outgoing-transactions?caseCode=${encodeURIComponent(code)}`
}
