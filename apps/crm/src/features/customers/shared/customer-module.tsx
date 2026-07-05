import { useEffect, useState, type ChangeEvent, type ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { getMediaContentUrl } from "@workspace/media"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { Check, FileText, Plus, RotateCcw, Save, Search, Send, Upload, X } from "lucide-react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PageTitle } from "@workspace/ui/components/page-title"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  customerApi,
  type Customer,
  type CustomerPayload,
  type CustomerType,
  type WorkflowTaskRole,
} from "../api"
import {
  useCompleteWorkflowTask,
  useCustomer,
  useCreateCustomerRelationship,
  useCustomerRelationships,
  useCustomers,
  useSaveCustomer,
  useSubmitCustomer,
  useCancelCustomer,
  useUploadCustomerAvatar,
  useCurrentAmendment,
  useStartAdjustment,
  useUpdateAmendment,
  useSubmitAmendment,
  useCancelAmendment,
} from "../queries"
import { GeoLocationFields } from "../geo-location-fields"
import { OrgUnitField } from "../org-unit-field"

type CustomerRoute = "registrations" | "profiles" | "risk" | "adjustments"

const customerSchema = z.object({
  id: z.string().trim().optional(),
  customerCode: z.string().trim().optional(),
  customerType: z.enum(["PERSONAL", "BUSINESS"]),
  avatarFileId: z.string().trim(),
  orgUnit: z.string().trim(),
  name: z.string().trim().min(1, "Tên khách hàng là bắt buộc"),
  provinceCode: z.string().trim(),
  wardCode: z.string().trim(),
  areaCode: z.string().trim(),
  permanentAddress: z.string().trim(),
  currentAddress: z.string().trim(),
  mobile: z.string().trim(),
  fixedPhone: z.string().trim(),
  email: z.string().trim().email("Email không hợp lệ").or(z.literal("")),
  taxCode: z.string().trim(),
  fax: z.string().trim(),
  economicType: z.string().trim(),
  economicSector: z.string().trim(),
  bankAccount: z.string().trim(),
  bankName: z.string().trim(),
  gender: z.string().trim(),
  dateOfBirth: z.string().trim(),
  ethnicity: z.string().trim(),
  maritalStatus: z.string().trim(),
  birthPlace: z.string().trim(),
  occupation: z.string().trim(),
  educationLevel: z.string().trim(),
  cultureLevel: z.string().trim(),
  identityType: z.string().trim(),
  identityNo: z.string().trim(),
  oldIdentityNo: z.string().trim(),
  identityIssueDate: z.string().trim(),
  identityExpiryDate: z.string().trim(),
  identityIssuePlace: z.string().trim(),
  segment: z.string().trim(),
  riskLevel: z.string().trim(),
  rank: z.string().trim(),
  memberCardNo: z.string().trim(),
  memberCardIssueDate: z.string().trim(),
  memberCardIssuePlace: z.string().trim(),
  extendedOccupation: z.string().trim(),
  jobTitle: z.string().trim(),
  workDuration: z.string().trim(),
  laborContractType: z.string().trim(),
  workplace: z.string().trim(),
  workplaceAddress: z.string().trim(),
  note: z.string().trim(),
  shortName: z.string().trim(),
  businessRegistrationNo: z.string().trim(),
  businessIssueDate: z.string().trim(),
  issuingAuthority: z.string().trim(),
  establishedDate: z.string().trim(),
  website: z.string().trim(),
  representative: z.string().trim(),
  representativeTitle: z.string().trim(),
  representativeIdentityNo: z.string().trim(),
  businessLine: z.string().trim(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

const relationshipSchema = z.object({
  relatedCustomerId: z.string().trim().min(1, "Mã khách hàng là bắt buộc"),
  relationType: z.string().trim().min(1, "Loại quan hệ là bắt buộc"),
  relationCode: z.string().trim().min(1, "Mã quan hệ là bắt buộc"),
  reciprocalRelationCode: z.string().trim().min(1, "Mã QH đối ứng là bắt buộc"),
  status: z.string().trim().min(1, "Trạng thái quan hệ là bắt buộc"),
})

type RelationshipFormValues = z.infer<typeof relationshipSchema>

const defaultValues: CustomerFormValues = {
  id: "",
  customerCode: "",
  customerType: "PERSONAL",
  avatarFileId: "",
  orgUnit: "",
  name: "",
  provinceCode: "",
  wardCode: "",
  areaCode: "",
  permanentAddress: "",
  currentAddress: "",
  mobile: "",
  fixedPhone: "",
  email: "",
  taxCode: "",
  fax: "",
  economicType: "",
  economicSector: "",
  bankAccount: "",
  bankName: "",
  gender: "Nam",
  dateOfBirth: "",
  ethnicity: "Kinh",
  maritalStatus: "Đã lập gia đình",
  birthPlace: "",
  occupation: "",
  educationLevel: "",
  cultureLevel: "",
  identityType: "Căn cước công dân",
  identityNo: "",
  oldIdentityNo: "",
  identityIssueDate: "",
  identityExpiryDate: "",
  identityIssuePlace: "",
  segment: "",
  riskLevel: "",
  rank: "",
  memberCardNo: "",
  memberCardIssueDate: "",
  memberCardIssuePlace: "",
  extendedOccupation: "",
  jobTitle: "",
  workDuration: "",
  laborContractType: "",
  workplace: "",
  workplaceAddress: "",
  note: "",
  shortName: "",
  businessRegistrationNo: "",
  businessIssueDate: "",
  issuingAuthority: "",
  establishedDate: "",
  website: "",
  representative: "",
  representativeTitle: "",
  representativeIdentityNo: "",
  businessLine: "",
}

const selectOptions = {
  customerType: [
    { value: "PERSONAL", label: "Khách hàng cá nhân" },
    { value: "BUSINESS", label: "Doanh nghiệp" },
  ],
  generic: [{ value: "none", label: "-- Chọn --" }],
  relation: [
    { value: "SPOUSE", label: "Vợ/Chồng" },
    { value: "PARENT", label: "Cha/Mẹ" },
    { value: "CHILD", label: "Con" },
    { value: "GUARANTOR", label: "Người bảo lãnh" },
  ],
  status: [
    { value: "ACTIVE", label: "Hoạt động" },
    { value: "INACTIVE", label: "Ngừng hiệu lực" },
  ],
}

const generalFieldsPrimary: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "textarea"]
> = [["name", "Tên khách hàng(*)", "input"]]

const generalFieldsRest: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "textarea"]
> = [
  ["permanentAddress", "Địa chỉ thường trú", "textarea"],
  ["currentAddress", "Địa chỉ hiện tại", "textarea"],
  ["mobile", "Số di động", "input"],
  ["fixedPhone", "Số cố định", "input"],
  ["email", "Email", "input"],
  ["taxCode", "Mã số thuế", "input"],
  ["fax", "Fax", "input"],
  ["economicType", "Loại hình kinh tế", "select"],
  ["economicSector", "Ngành kinh tế", "select"],
  ["bankAccount", "Số tài khoản", "input"],
  ["bankName", "Tại ngân hàng", "input"],
]

const personalFields: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "date"]
> = [
  ["gender", "Giới tính", "select"],
  ["dateOfBirth", "Ngày sinh", "date"],
  ["ethnicity", "Dân tộc", "input"],
  ["maritalStatus", "Tình trạng hôn nhân", "input"],
  ["birthPlace", "Nơi sinh", "input"],
  ["occupation", "Nghề nghiệp", "select"],
  ["educationLevel", "Trình độ học vấn", "select"],
  ["cultureLevel", "Trình độ văn hóa", "select"],
  ["identityType", "Loại định danh", "input"],
  ["identityNo", "CCCD/CMND", "input"],
  ["oldIdentityNo", "Số định danh cũ", "input"],
  ["identityIssueDate", "Ngày cấp", "date"],
  ["identityExpiryDate", "Ngày hết hiệu lực", "date"],
  ["identityIssuePlace", "Nơi cấp", "input"],
]

const extendedFields: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "date" | "textarea"]
> = [
  ["segment", "Phân khúc KH", "select"],
  ["riskLevel", "Phân loại rủi ro", "select"],
  ["rank", "Hạng khách hàng", "select"],
  ["memberCardNo", "Số thẻ hội viên", "input"],
  ["memberCardIssueDate", "Ngày cấp thẻ", "date"],
  ["memberCardIssuePlace", "Nơi cấp thẻ", "input"],
  ["extendedOccupation", "Nghề nghiệp", "input"],
  ["jobTitle", "Chức vụ nơi công tác", "input"],
  ["workDuration", "Thời gian công tác", "select"],
  ["laborContractType", "Loại HĐLĐ", "input"],
  ["workplace", "Nơi công tác", "input"],
  ["workplaceAddress", "Địa chỉ công tác", "input"],
  ["note", "Ghi chú", "textarea"],
]

const businessFields: Array<
  [keyof CustomerFormValues, string, "input" | "date"]
> = [
  ["shortName", "Tên tắt doanh nghiệp", "input"],
  ["businessRegistrationNo", "Số đăng ký kinh doanh", "input"],
  ["businessIssueDate", "Ngày cấp", "date"],
  ["issuingAuthority", "Cơ quan ban hành", "input"],
  ["establishedDate", "Ngày thành lập", "date"],
  ["website", "Website", "input"],
  ["representative", "Người đại diện", "input"],
  ["representativeTitle", "Chức vụ nơi công tác", "input"],
  ["representativeIdentityNo", "CCCD/CMND", "input"],
  ["businessLine", "Ngành kinh doanh", "input"],
]

export function CustomersPage({ pathname }: { pathname: string }) {
  const { t } = useI18n()
  const route = routeFromPath(pathname)
  if (route === "profiles")
    return (
      <CustomerTable
        title={t("crm.customers.profiles.title")}
        description={t("crm.customers.profiles.description")}
        mode="profiles"
      />
    )
  if (route === "risk")
    return (
      <CustomerTable
        title={t("crm.customers.risk.title")}
        description={t("crm.customers.risk.description")}
        mode="risk"
      />
    )
  if (route === "adjustments")
    return <CustomerAdjustmentPage initialCustomerId={customerIdFromSearch()} />
  return <CustomerRegistrationPage initialCustomerId={customerIdFromSearch()} />
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
      navigateTo("/workbench/outgoing-transactions")
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
                    navigateTo("/workbench/outgoing-transactions")
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

function CustomerRegistrationTabsList({
  isPersonal,
  canAddRelationship,
}: {
  isPersonal: boolean
  canAddRelationship: boolean
}) {
  return (
    <TabsList className="flex h-auto flex-wrap justify-start">
      <TabsTrigger value="general">Thông tin khách hàng</TabsTrigger>
      {isPersonal ? (
        <TabsTrigger value="relationships" disabled={!canAddRelationship}>
          Người có liên quan
        </TabsTrigger>
      ) : null}
    </TabsList>
  )
}

export function CustomerAdjustmentPage({
  initialCustomerId,
}: {
  initialCustomerId?: string | null
}) {
  const { t } = useI18n()
  const customerId = initialCustomerId?.trim() || ""
  const taskContext = taskContextFromSearch()
  const customerQuery = useCustomer(customerId || null)
  const amendmentQuery = useCurrentAmendment(customerId || null)
  const startAdjustment = useStartAdjustment()
  const updateAmendment = useUpdateAmendment(customerId)
  const submitAmendment = useSubmitAmendment(customerId)
  const cancelAmendment = useCancelAmendment(customerId)
  const completeTask = useCompleteWorkflowTask(taskContext.role)
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  })
  const customer = customerQuery.data ?? null
  const amendment = amendmentQuery.data ?? null
  const customerType = form.watch("customerType")
  const isPersonal = customerType === "PERSONAL"
  const readOnly = amendment?.status === "PENDING"
  const canEdit = amendment?.status === "DRAFT"
  const canSubmit = canEdit && Boolean(amendment?.id)
  const canCancelDraft = canEdit && Boolean(amendment?.id)
  const canStart =
    Boolean(customerId) &&
    customer?.status === "ACTIVE" &&
    !amendment &&
    !amendmentQuery.isFetching
  const awaitingAmendmentResubmit =
    amendment?.status === "DRAFT" && hasTaskContext(taskContext)

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
    completeTask.mutate({
      jobKey: resolved.jobKey,
      processInstanceKey: resolved.processInstanceKey,
      elementId: resolved.elementId,
      variables,
    })
  }

  if (!customerId) {
    return (
      <section className="space-y-4">
        <Header
          title={t("crm.customers.adjustments.title")}
          description={t("crm.customers.adjustments.description")}
        />
        <EmptyState text="Thiếu customerId trên URL." />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <Header
        title={t("crm.customers.adjustments.title")}
        description={t("crm.customers.adjustments.description")}
      />
      {customerQuery.isFetching || amendmentQuery.isFetching ? (
        <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
          Đang tải hồ sơ...
        </div>
      ) : null}
      {customer ? <RegistrationMetaBar customer={customer} /> : null}
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
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("crm.customers.adjustments.resubmit_banner")}
        </div>
      ) : null}
      {readOnly ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {t("crm.customers.adjustments.pending_banner")}
        </div>
      ) : null}
      <CurrentTaskPanel
        context={taskContext}
        completing={completeTask.isPending}
        onComplete={completeCurrentTask}
      />
      {canStart ? (
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={startAdjustment.isPending}
            onClick={() => startAdjustment.mutate(customerId)}
          >
            <Plus className="size-4" />
            {t("crm.customers.adjustments.start")}
          </Button>
        </div>
      ) : null}
      {amendment ? (
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveAdjustment(values))}
        >
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">Thông tin khách hàng</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4">
              <Panel title="Thông tin chung">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <FormField label="Loại khách hàng">
                    <Input value={customerTypeLabel(customerType)} readOnly />
                  </FormField>
                  <OrgUnitField form={form} disabled={readOnly} />
                  <FieldGrid fields={generalFieldsPrimary} form={form} bare />
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
            </TabsContent>
          </Tabs>
          <fieldset disabled={readOnly} className="space-y-0">
            <div className="flex flex-wrap justify-end gap-2">
              {customer ? <StatusBadge status={customer.status} /> : null}
              <Button
                type="submit"
                disabled={!canEdit || updateAmendment.isPending}
              >
                <Save className="size-4" />
                {t("crm.customers.adjustments.save")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!canSubmit || submitAmendment.isPending}
                onClick={form.handleSubmit(async (values) => {
                  await saveAdjustment(values)
                  if (!amendment?.id) return
                  await submitAmendment.mutateAsync(amendment.id)
                })}
              >
                <Send className="size-4" />
                {t("crm.customers.adjustments.submit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canCancelDraft || cancelAmendment.isPending}
                onClick={() => {
                  if (!amendment?.id) return
                  cancelAmendment.mutate(amendment.id)
                }}
              >
                <X className="size-4" />
                {t("crm.customers.adjustments.cancel_draft")}
              </Button>
            </div>
          </fieldset>
        </form>
      ) : null}
    </section>
  )
}

function CurrentTaskPanel({
  context,
  completing,
  onComplete,
}: {
  context: CustomerTaskContext
  completing: boolean
  onComplete: (decision: string) => void
}) {
  if (!hasTaskContext(context)) return null

  const makerTask = context.role === "CUSTOMER_MAKER"
  return (
    <Panel title="Việc BPM hiện tại">
      <div className="grid gap-3 text-sm md:grid-cols-5">
        <ContextField label="Mã case" value={context.caseCode || context.caseId} />
        <ContextField label="Task key" value={context.taskKey?.toString()} />
        <ContextField label="Bước" value={context.elementId} />
        <ContextField label="Vai trò" value={context.role} />
        <ContextField label="Customer" value={context.customerId} />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {makerTask ? (
          <Button
            type="button"
            disabled={completing}
            onClick={() => onComplete("APPROVE")}
          >
            <Send className="size-4" />
            Gửi lại
          </Button>
        ) : (
          <>
            <Button
              type="button"
              disabled={completing}
              onClick={() => onComplete("APPROVE")}
            >
              <Check className="size-4" />
              Duyệt
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={completing}
              onClick={() => onComplete("REQUEST_CHANGES")}
            >
              <RotateCcw className="size-4" />
              Bổ sung
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={completing}
              onClick={() => onComplete("REJECT")}
            >
              <X className="size-4" />
              Từ chối
            </Button>
          </>
        )}
      </div>
    </Panel>
  )
}

function FieldGrid({
  fields,
  form,
  bare = false,
}: {
  fields: Array<
    [keyof CustomerFormValues, string, "input" | "select" | "textarea" | "date"]
  >
  form: ReturnType<typeof useForm<CustomerFormValues>>
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

function AvatarUploader({
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

function RelationshipsPanel({ customer }: { customer: Customer }) {
  const relationshipsQuery = useCustomerRelationships(customer.id)
  const approvedCustomersQuery = useCustomers({ status: "ACTIVE" })
  const createRelationship = useCreateCustomerRelationship(customer.id)
  const candidates = (approvedCustomersQuery.data ?? []).filter(
    (item) => item.id !== customer.id
  )
  const form = useForm<RelationshipFormValues>({
    resolver: zodResolver(relationshipSchema),
    defaultValues: {
      relatedCustomerId: "",
      relationType: "",
      relationCode: "",
      reciprocalRelationCode: "",
      status: "ACTIVE",
    },
  })

  const submit = form.handleSubmit(async (values) => {
    await createRelationship.mutateAsync(values)
    form.reset({
      relatedCustomerId: "",
      relationType: "",
      relationCode: "",
      reciprocalRelationCode: "",
      status: "ACTIVE",
    })
  })

  return (
    <Panel title="Người có liên quan">
      <form
        className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={submit}
      >
        <FormField
          label="Mã khách hàng(*)"
          error={form.formState.errors.relatedCustomerId?.message}
        >
          <Controller
            control={form.control}
            name="relatedCustomerId"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) =>
                  field.onChange(value === "none" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Chọn khách hàng --</SelectItem>
                  {candidates.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.customerCode || item.id} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField
          label="Loại quan hệ(*)"
          error={form.formState.errors.relationType?.message}
        >
          <Input {...form.register("relationType")} />
        </FormField>
        <FormField
          label="Mã quan hệ(*)"
          error={form.formState.errors.relationCode?.message}
        >
          <Controller
            control={form.control}
            name="relationCode"
            render={({ field }) => (
              <RelationSelect value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>
        <FormField
          label="Mã QH đối ứng(*)"
          error={form.formState.errors.reciprocalRelationCode?.message}
        >
          <Controller
            control={form.control}
            name="reciprocalRelationCode"
            render={({ field }) => (
              <RelationSelect value={field.value} onChange={field.onChange} />
            )}
          />
        </FormField>
        <FormField
          label="Trạng thái quan he(*)"
          error={form.formState.errors.status?.message}
        >
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectOptions.status.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <div className="md:col-span-2 xl:col-span-5">
          <Button
            type="submit"
            disabled={createRelationship.isPending || !candidates.length}
          >
            <Plus className="size-4" />
            Thêm mới
          </Button>
        </div>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>TT</TableHead>
            <TableHead>Mã khách hàng</TableHead>
            <TableHead>Tên khách hàng</TableHead>
            <TableHead>Địa chỉ</TableHead>
            <TableHead>Tên quan hệ</TableHead>
            <TableHead>Tên quan hệ đối ứng</TableHead>
            <TableHead>Trạng thái quan he</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(relationshipsQuery.data ?? []).map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">
                {item.relatedCustomerCode || item.relatedCustomerId}
              </TableCell>
              <TableCell>{item.relatedCustomerName || "-"}</TableCell>
              <TableCell className="max-w-64 truncate">
                {item.relatedCustomerAddress || "-"}
              </TableCell>
              <TableCell>{relationLabel(item.relationCode)}</TableCell>
              <TableCell>
                {relationLabel(item.reciprocalRelationCode)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{item.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
          {!relationshipsQuery.data?.length ? (
            <EmptyTable colSpan={7} text="Chưa có quan hệ khách hàng." />
          ) : null}
        </TableBody>
      </Table>
    </Panel>
  )
}

function RelationSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Select
      value={value || "none"}
      onValueChange={(next) => onChange(next === "none" ? "" : next)}
    >
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">-- Chọn Mã quan hệ --</SelectItem>
        {selectOptions.relation.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function CustomerTable({
  title,
  description,
  mode,
}: {
  title: string
  description: string
  mode: "profiles" | "risk"
}) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const customersQuery = useCustomers({
    q: submittedQuery || undefined,
    riskOnly: mode === "risk",
    status: "ACTIVE",
  })
  const items = customersQuery.data ?? []

  return (
    <section className="space-y-4">
      <Header title={title} description={description} />
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmittedQuery(query.trim())
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("crm.customers.search_placeholder")}
          />
        </div>
        <Button type="submit">
          <Search className="size-4" />
          {t("crm.actions.search")}
        </Button>
      </form>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {mode === "profiles" ? <TableHead>Chọn</TableHead> : null}
              <TableHead>TT</TableHead>
              <TableHead>Mã khách hàng</TableHead>
              <TableHead>Tên khách hàng</TableHead>
              {mode === "profiles" ? (
                <TableHead>Phân khúc khách hàng</TableHead>
              ) : null}
              <TableHead>Loại khách hàng</TableHead>
              {mode === "profiles" ? (
                <TableHead>Hạng khách hàng</TableHead>
              ) : (
                <TableHead>Phân loại rủi ro</TableHead>
              )}
              <TableHead>Số di động</TableHead>
              <TableHead>CCCD/CMND</TableHead>
              <TableHead>Địa chỉ</TableHead>
              {mode === "profiles" ? <TableHead>Thao tác</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                {mode === "profiles" ? (
                  <TableCell>
                    <input aria-label={`Chọn ${item.id}`} type="checkbox" />
                  </TableCell>
                ) : null}
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">
                  {item.customerCode || item.id}
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                {mode === "profiles" ? (
                  <TableCell>{item.segment || "-"}</TableCell>
                ) : null}
                <TableCell>{customerTypeLabel(item.customerType)}</TableCell>
                <TableCell>
                  {mode === "profiles"
                    ? item.rank || "-"
                    : item.riskLevel || "-"}
                </TableCell>
                <TableCell>{item.mobile || "-"}</TableCell>
                <TableCell>{item.identityNo || "-"}</TableCell>
                <TableCell className="max-w-72 truncate">
                  {item.address || "-"}
                </TableCell>
                {mode === "profiles" ? (
                  <TableCell>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        navigateTo(
                          `/customers/adjustments?customerId=${encodeURIComponent(item.id)}`
                        )
                      }
                    >
                      {t("crm.customers.adjustments.action")}
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {!items.length ? (
              <EmptyTable
                colSpan={mode === "profiles" ? 11 : 8}
                text={t("crm.customers.empty")}
              />
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function RegistrationSubmittedBanner({
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

function RegistrationMetaBar({ customer }: { customer: Customer | null }) {
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-md border p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function Header({
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

function StatusBadge({ status }: { status: string }) {
  const variant = status === "ACTIVE" || status === "APPROVED" ? "default" : "secondary"
  return <Badge variant={variant}>{status}</Badge>
}

function EmptyTable({ colSpan, text }: { colSpan: number; text: string }) {
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

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}

function optionsFor(_name: keyof CustomerFormValues) {
  return selectOptions.generic
}

function toPayload(
  values: CustomerFormValues,
  existingId?: string,
  existingStatus?: Customer["status"]
) {
  const generalInfo = pick(values, [
    "orgUnit",
    "avatarFileId",
    "provinceCode",
    "wardCode",
    "areaCode",
    "permanentAddress",
    "currentAddress",
    "fixedPhone",
    "taxCode",
    "fax",
    "economicType",
    "economicSector",
    "bankAccount",
    "bankName",
  ])
  const personalInfo =
    values.customerType === "PERSONAL"
      ? pick(values, [
          "gender",
          "dateOfBirth",
          "ethnicity",
          "maritalStatus",
          "birthPlace",
          "occupation",
          "educationLevel",
          "cultureLevel",
          "identityType",
          "identityNo",
          "oldIdentityNo",
          "identityIssueDate",
          "identityExpiryDate",
          "identityIssuePlace",
        ])
      : {}
  const businessInfo =
    values.customerType === "BUSINESS"
      ? pick(values, [
          "shortName",
          "businessRegistrationNo",
          "businessIssueDate",
          "issuingAuthority",
          "establishedDate",
          "website",
          "representative",
          "representativeTitle",
          "representativeIdentityNo",
          "businessLine",
        ])
      : {}
  const extendedInfo =
    values.customerType === "PERSONAL"
      ? pick(values, [
          "memberCardNo",
          "memberCardIssueDate",
          "memberCardIssuePlace",
          "extendedOccupation",
          "jobTitle",
          "workDuration",
          "laborContractType",
          "workplace",
          "workplaceAddress",
          "note",
        ])
      : {}

  const payload: CustomerPayload = {
    customerType: values.customerType,
    name: values.name.trim(),
    email: values.email.trim(),
    status: existingStatus ?? "DRAFT",
    mobile: values.mobile.trim(),
    identityNo:
      values.customerType === "PERSONAL"
        ? values.identityNo.trim()
        : values.representativeIdentityNo.trim(),
    address: values.currentAddress.trim() || values.permanentAddress.trim(),
    segment: values.segment.trim(),
    rank: values.rank.trim(),
    riskLevel: values.riskLevel.trim(),
    generalInfo,
    personalInfo,
    businessInfo,
    extendedInfo,
  }
  const id = (existingId ?? values.id ?? "").trim()
  if (id) payload.id = id
  return payload
}

function toFormValues(customer: Customer): CustomerFormValues {
  const general = customer.generalInfo
  const personal = customer.personalInfo
  const business = customer.businessInfo
  const extended = customer.extendedInfo
  return {
    ...defaultValues,
    id: customer.id,
    customerCode: customer.customerCode,
    customerType: customer.customerType,
    avatarFileId: stringValue(general.avatarFileId),
    orgUnit: stringValue(general.orgUnit),
    name: customer.name,
    provinceCode: stringValue(general.provinceCode),
    wardCode: stringValue(general.wardCode),
    areaCode: stringValue(general.areaCode),
    permanentAddress: stringValue(general.permanentAddress),
    currentAddress: stringValue(general.currentAddress),
    mobile: customer.mobile,
    fixedPhone: stringValue(general.fixedPhone),
    email: customer.email,
    taxCode: stringValue(general.taxCode),
    fax: stringValue(general.fax),
    economicType: stringValue(general.economicType),
    economicSector: stringValue(general.economicSector),
    bankAccount: stringValue(general.bankAccount),
    bankName: stringValue(general.bankName),
    gender: stringValue(personal.gender) || defaultValues.gender,
    dateOfBirth: stringValue(personal.dateOfBirth),
    ethnicity: stringValue(personal.ethnicity) || defaultValues.ethnicity,
    maritalStatus:
      stringValue(personal.maritalStatus) || defaultValues.maritalStatus,
    birthPlace: stringValue(personal.birthPlace),
    occupation: stringValue(personal.occupation),
    educationLevel: stringValue(personal.educationLevel),
    cultureLevel: stringValue(personal.cultureLevel),
    identityType:
      stringValue(personal.identityType) || defaultValues.identityType,
    identityNo: stringValue(personal.identityNo) || customer.identityNo,
    oldIdentityNo: stringValue(personal.oldIdentityNo),
    identityIssueDate: stringValue(personal.identityIssueDate),
    identityExpiryDate: stringValue(personal.identityExpiryDate),
    identityIssuePlace: stringValue(personal.identityIssuePlace),
    segment: customer.segment,
    riskLevel: customer.riskLevel,
    rank: customer.rank,
    memberCardNo: stringValue(extended.memberCardNo),
    memberCardIssueDate: stringValue(extended.memberCardIssueDate),
    memberCardIssuePlace: stringValue(extended.memberCardIssuePlace),
    extendedOccupation: stringValue(extended.extendedOccupation),
    jobTitle: stringValue(extended.jobTitle),
    workDuration: stringValue(extended.workDuration),
    laborContractType: stringValue(extended.laborContractType),
    workplace: stringValue(extended.workplace),
    workplaceAddress: stringValue(extended.workplaceAddress),
    note: stringValue(extended.note),
    shortName: stringValue(business.shortName),
    businessRegistrationNo: stringValue(business.businessRegistrationNo),
    businessIssueDate: stringValue(business.businessIssueDate),
    issuingAuthority: stringValue(business.issuingAuthority),
    establishedDate: stringValue(business.establishedDate),
    website: stringValue(business.website),
    representative: stringValue(business.representative),
    representativeTitle: stringValue(business.representativeTitle),
    representativeIdentityNo:
      stringValue(business.representativeIdentityNo) || customer.identityNo,
    businessLine: stringValue(business.businessLine),
  }
}

function pick(
  values: CustomerFormValues,
  keys: Array<keyof CustomerFormValues>
) {
  return Object.fromEntries(keys.map((key) => [key, values[key]]))
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function customerTypeLabel(value: CustomerType) {
  return value === "BUSINESS" ? "Doanh nghiệp" : "Cá nhân"
}

function relationLabel(value: string) {
  return (
    selectOptions.relation.find((item) => item.value === value)?.label ?? value
  )
}

type CustomerTaskContext = {
  customerId: string | null
  caseId: string | null
  caseCode: string | null
  taskKey: string | null
  processInstanceKey: string | null
  elementId: string | null
  role: WorkflowTaskRole
}

function effectiveBpmnElementId(
  role: WorkflowTaskRole,
  elementId: string | null,
  customerStatus?: Customer["status"]
) {
  if (role === "CUSTOMER_MAKER") {
    if (
      customerStatus === "NEEDS_CHANGES" ||
      elementId === "Activity_CheckerReview" ||
      !elementId
    ) {
      return "Activity_MakerRevise"
    }
  }
  return elementId
}

function syncTaskContextSearch(updates: {
  taskKey?: string
  elementId?: string
  role?: WorkflowTaskRole | string
}) {
  const params = new URLSearchParams(window.location.search)
  if (updates.taskKey) params.set("taskKey", updates.taskKey)
  if (updates.elementId) params.set("elementId", updates.elementId)
  if (updates.role) params.set("role", updates.role)
  navigateTo(`${window.location.pathname}?${params.toString()}`)
}

async function resolveWorkflowJobKey(
  context: CustomerTaskContext,
  customerStatus?: Customer["status"]
): Promise<{
  jobKey: string
  processInstanceKey: string
  elementId: string
  role: WorkflowTaskRole
} | null> {
  if (!context.processInstanceKey) {
    notify.error(
      "Thiếu ngữ cảnh task BPM",
      "Không có processInstanceKey — mở lại việc từ workbench."
    )
    return null
  }
  const elementId = effectiveBpmnElementId(
    context.role,
    context.elementId,
    customerStatus
  )
  if (!elementId) {
    notify.error("Thiếu ngữ cảnh task BPM", "Không xác định được bước BPM (elementId).")
    return null
  }
  if (context.taskKey) {
    return {
      jobKey: context.taskKey,
      processInstanceKey: context.processInstanceKey,
      elementId,
      role: context.role,
    }
  }
  try {
    const task = await customerApi.claimWorkflowTask({
      role: context.role,
      processInstanceKey: context.processInstanceKey,
      caseId: context.caseId,
      elementId,
    })
    const jobKey = workflowKey(task.jobKey)
    if (!jobKey) {
      notify.error(
        "Thiếu ngữ cảnh task BPM",
        "Không lấy được task key từ Zeebe — kiểm tra workflow-service và Zeebe."
      )
      return null
    }
    const processInstanceKey =
      workflowKey(task.processInstanceKey) || context.processInstanceKey
    syncTaskContextSearch({
      taskKey: jobKey,
      elementId: task.elementId || elementId,
      role: task.candidateRole || context.role,
    })
    return {
      jobKey,
      processInstanceKey,
      elementId: task.elementId || elementId,
      role: roleParam(task.candidateRole || context.role),
    }
  } catch (error) {
    notify.error(
      "Thiếu ngữ cảnh task BPM",
      error instanceof Error ? error.message : "Không claim được task từ workflow."
    )
    return null
  }
}

function taskContextFromSearch(): CustomerTaskContext {
  const params = new URLSearchParams(window.location.search)
  return {
    customerId: params.get("customerId"),
    caseId: params.get("caseId"),
    caseCode: params.get("caseCode"),
    taskKey: stringParam(params, "taskKey"),
    processInstanceKey: stringParam(params, "processInstanceKey"),
    elementId: params.get("elementId"),
    role: roleParam(params.get("role")),
  }
}

function hasTaskContext(context: CustomerTaskContext) {
  return Boolean(context.caseId || context.taskKey || context.elementId)
}

function ContextField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="break-words font-mono text-xs">{value || "-"}</p>
    </div>
  )
}

function stringParam(params: URLSearchParams, key: string) {
  const value = params.get(key)?.trim()
  return value || null
}

function workflowKey(value: string | number | null | undefined) {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

function roleParam(value: string | null): WorkflowTaskRole {
  if (value === "CUSTOMER_RISK_CHECKER" || value === "CUSTOMER_MAKER") return value
  return "CUSTOMER_CHECKER"
}

function customerIdFromSearch() {
  return taskContextFromSearch().customerId
}

function routeFromPath(pathname: string): CustomerRoute {
  if (pathname.startsWith("/customers/profiles")) return "profiles"
  if (pathname.startsWith("/customers/risk-cases")) return "risk"
  if (pathname.startsWith("/customers/adjustments")) return "adjustments"
  return "registrations"
}

function navigateTo(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function toAmendmentSnapshot(values: CustomerFormValues): Record<string, unknown> {
  const payload = toPayload(values, values.id, "ACTIVE")
  return {
    name: payload.name,
    email: payload.email,
    mobile: payload.mobile,
    identityNo: payload.identityNo,
    address: payload.address,
    customerType: payload.customerType,
    personalInfo: payload.personalInfo,
    businessInfo: payload.businessInfo,
    extendedInfo: payload.extendedInfo,
    generalInfo: payload.generalInfo,
  }
}

function computeChangedFields(
  customer: Customer | null,
  afterSnapshot: Record<string, unknown>
): string[] {
  if (!customer) return []
  const fields: string[] = []
  const compare = (key: string, before: string, after: unknown) => {
    if (String(after ?? "").trim() !== before.trim()) fields.push(key)
  }
  compare("name", customer.name, afterSnapshot.name)
  compare("email", customer.email, afterSnapshot.email)
  compare("mobile", customer.mobile, afterSnapshot.mobile)
  compare("identityNo", customer.identityNo, afterSnapshot.identityNo)
  compare("address", customer.address, afterSnapshot.address)
  return fields
}

