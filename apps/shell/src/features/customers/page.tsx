import { useEffect, useState, type ChangeEvent, type ReactNode } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { getMediaContentUrl } from "@workspace/media"
import { notify } from "@workspace/notifications/notify"
import { FileText, Plus, Save, Search, Send, Upload } from "lucide-react"
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
import type { Customer, CustomerType, WorkflowTaskRole } from "./api"
import {
  useCompleteWorkflowTask,
  useCustomer,
  useCreateCustomerRelationship,
  useCustomerRelationships,
  useCustomers,
  useSaveCustomer,
  useSubmitCustomer,
  useCustomerDrafts,
  useUploadCustomerAvatar,
  useWorkflowTasks,
} from "./queries"

type CustomerRoute = "registrations" | "profiles" | "risk"
type WorkbenchRoute = "drafts" | "tasks"

const customerSchema = z.object({
  id: z.string().trim().min(1, "Ma khach hang la bat buoc"),
  customerType: z.enum(["PERSONAL", "BUSINESS"]),
  avatarFileId: z.string().trim(),
  orgUnit: z.string().trim(),
  name: z.string().trim().min(1, "Ten khach hang la bat buoc"),
  provinceCode: z.string().trim(),
  wardCode: z.string().trim(),
  areaCode: z.string().trim(),
  permanentAddress: z.string().trim(),
  currentAddress: z.string().trim(),
  mobile: z.string().trim(),
  fixedPhone: z.string().trim(),
  email: z.string().trim().email("Email khong hop le").or(z.literal("")),
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
  relatedCustomerId: z.string().trim().min(1, "Ma khach hang la bat buoc"),
  relationType: z.string().trim().min(1, "Loai quan he la bat buoc"),
  relationCode: z.string().trim().min(1, "Ma quan he la bat buoc"),
  reciprocalRelationCode: z.string().trim().min(1, "Ma QH doi ung la bat buoc"),
  status: z.string().trim().min(1, "Trang thai quan he la bat buoc"),
})

type RelationshipFormValues = z.infer<typeof relationshipSchema>

const defaultValues: CustomerFormValues = {
  id: "",
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
  maritalStatus: "Da lap gia dinh",
  birthPlace: "",
  occupation: "",
  educationLevel: "",
  cultureLevel: "",
  identityType: "Can cuoc cong dan",
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
    { value: "PERSONAL", label: "Khach hang ca nhan" },
    { value: "BUSINESS", label: "Doanh nghiep" },
  ],
  province: [{ value: "none", label: "-- Chon Tinh, Thanh pho --" }],
  ward: [{ value: "none", label: "-- Chon Phuong/Xa --" }],
  area: [{ value: "none", label: "-- Chon khu vuc --" }],
  generic: [{ value: "none", label: "-- Chon --" }],
  relation: [
    { value: "SPOUSE", label: "Vo/Chong" },
    { value: "PARENT", label: "Cha/Me" },
    { value: "CHILD", label: "Con" },
    { value: "GUARANTOR", label: "Nguoi bao lanh" },
  ],
  status: [
    { value: "ACTIVE", label: "Hoat dong" },
    { value: "INACTIVE", label: "Ngung hieu luc" },
  ],
}

const generalFields: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "textarea"]
> = [
  ["id", "Ma khach hang(*)", "input"],
  ["orgUnit", "Don vi", "input"],
  ["name", "Ten khach hang(*)", "input"],
  ["provinceCode", "Ma tinh", "select"],
  ["wardCode", "Ma phuong xa", "select"],
  ["areaCode", "Ma khu vuc", "select"],
  ["permanentAddress", "Dia chi thuong tru", "textarea"],
  ["currentAddress", "Dia chi hien tai", "textarea"],
  ["mobile", "So di dong", "input"],
  ["fixedPhone", "So co dinh", "input"],
  ["email", "Email", "input"],
  ["taxCode", "Ma so thue", "input"],
  ["fax", "Fax", "input"],
  ["economicType", "Loai hinh kinh te", "select"],
  ["economicSector", "Nganh kinh te", "select"],
  ["bankAccount", "So tai khoan", "input"],
  ["bankName", "Tai ngan hang", "input"],
]

const personalFields: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "date"]
> = [
  ["gender", "Gioi tinh", "select"],
  ["dateOfBirth", "Ngay sinh", "date"],
  ["ethnicity", "Dan toc", "input"],
  ["maritalStatus", "Tinh trang hon nhan", "input"],
  ["birthPlace", "Noi sinh", "input"],
  ["occupation", "Nghe nghiep", "select"],
  ["educationLevel", "Trinh do hoc van", "select"],
  ["cultureLevel", "Trinh do van hoa", "select"],
  ["identityType", "Loai dinh danh", "input"],
  ["identityNo", "CCCD/CMND", "input"],
  ["oldIdentityNo", "So dinh danh cu", "input"],
  ["identityIssueDate", "Ngay cap", "date"],
  ["identityExpiryDate", "Ngay het hieu luc", "date"],
  ["identityIssuePlace", "Noi cap", "input"],
]

const extendedFields: Array<
  [keyof CustomerFormValues, string, "input" | "select" | "date" | "textarea"]
> = [
  ["segment", "Phan khuc KH", "select"],
  ["riskLevel", "Phan loai rui ro", "select"],
  ["rank", "Hang khach hang", "select"],
  ["memberCardNo", "So the hoi vien", "input"],
  ["memberCardIssueDate", "Ngay cap the", "date"],
  ["memberCardIssuePlace", "Noi cap the", "input"],
  ["extendedOccupation", "Nghe nghiep", "input"],
  ["jobTitle", "Chuc vu noi cong tac", "input"],
  ["workDuration", "Thoi gian cong tac", "select"],
  ["laborContractType", "Loai HDLD", "input"],
  ["workplace", "Noi cong tac", "input"],
  ["workplaceAddress", "Dia chi cong tac", "input"],
  ["note", "Ghi chu", "textarea"],
]

const businessFields: Array<
  [keyof CustomerFormValues, string, "input" | "date"]
> = [
  ["shortName", "Ten tat doanh nghiep", "input"],
  ["businessRegistrationNo", "So dang ky kinh doanh", "input"],
  ["businessIssueDate", "Ngay cap", "date"],
  ["issuingAuthority", "Co quan ban hanh", "input"],
  ["establishedDate", "Ngay thanh lap", "date"],
  ["website", "Website", "input"],
  ["representative", "Nguoi dai dien", "input"],
  ["representativeTitle", "Chuc vu noi cong tac", "input"],
  ["representativeIdentityNo", "CCCD/CMND", "input"],
  ["businessLine", "Nganh kinh doanh", "input"],
]

export function CustomersPage({ pathname }: { pathname: string }) {
  const route = routeFromPath(pathname)
  if (route === "profiles")
    return <CustomerTable title="Ho so khach hang" mode="profiles" />
  if (route === "risk")
    return <CustomerTable title="Khach hang rui ro" mode="risk" />
  return <CustomerRegistrationPage initialCustomerId={customerIdFromSearch()} />
}

export function WorkbenchPage({ pathname }: { pathname: string }) {
  const route = workbenchRouteFromPath(pathname)
  if (route === "tasks") return <TaskWorkbenchPage />
  return <DraftWorkbenchPage />
}

function CustomerRegistrationPage({
  initialCustomerId,
}: {
  initialCustomerId?: string | null
}) {
  const [savedCustomer, setSavedCustomer] = useState<Customer | null>(null)
  const saveCustomer = useSaveCustomer()
  const submitCustomer = useSubmitCustomer()
  const uploadAvatar = useUploadCustomerAvatar()
  const customerQuery = useCustomer(initialCustomerId ?? null)
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  })
  const customerType = form.watch("customerType")
  const isPersonal = customerType === "PERSONAL"
  const canAddRelationship = isPersonal && savedCustomer?.status === "APPROVED"

  useEffect(() => {
    if (!customerQuery.data) return
    form.reset(toFormValues(customerQuery.data))
    setSavedCustomer(customerQuery.data)
  }, [customerQuery.data, form])

  async function save(values: CustomerFormValues, submit = false) {
    const saved = await saveCustomer.mutateAsync(toPayload(values))
    setSavedCustomer(saved)
    if (submit) {
      const submitted = await submitCustomer.mutateAsync(saved.id)
      setSavedCustomer(submitted)
    }
  }

  async function uploadAvatarFile(file: File) {
    const customerId = form.getValues("id").trim()
    if (!customerId) {
      notify.error("Nhap Ma khach hang truoc khi upload anh dai dien")
      return
    }
    if (!file.type.startsWith("image/")) {
      notify.error("File anh khong hop le")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error("Anh dai dien toi da 5MB")
      return
    }
    const result = await uploadAvatar.mutateAsync({ file, customerId })
    form.setValue("avatarFileId", result.public_id, { shouldDirty: true })
  }

  return (
    <section className="space-y-4">
      <Header
        title="Dang ky khach hang"
        description="Nhap thong tin khach hang hoi vien, luu nhap hoac trinh duyet theo BPM."
      />
      {customerQuery.isFetching ? (
        <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
          Dang tai ho so {initialCustomerId}...
        </div>
      ) : null}
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => save(values))}
      >
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="general">Thong tin khach hang</TabsTrigger>
            {isPersonal ? (
              <TabsTrigger value="relationships" disabled={!canAddRelationship}>
                Nguoi co lien quan
              </TabsTrigger>
            ) : null}
          </TabsList>
          <TabsContent value="general" className="space-y-4">
            <Panel title="Thong tin chung">
              <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
                <div className="space-y-3">
                  <FormField label="Loai khach hang">
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
                  <FieldGrid fields={generalFields} form={form} />
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
                <Panel title="Thong tin dinh danh">
                  <FieldGrid fields={personalFields} form={form} />
                </Panel>
                <Panel title="Thong tin mo rong">
                  <FieldGrid fields={extendedFields} form={form} />
                </Panel>
              </>
            ) : (
              <Panel title="Thong tin doanh nghiep">
                <FieldGrid fields={businessFields} form={form} />
              </Panel>
            )}
          </TabsContent>
          {isPersonal ? (
            <TabsContent value="relationships">
              {savedCustomer ? (
                <RelationshipsPanel customer={savedCustomer} />
              ) : (
                <EmptyState text="Luu va hoan thanh ho so khach hang truoc khi khai bao nguoi co lien quan." />
              )}
            </TabsContent>
          ) : null}
        </Tabs>
        <div className="flex flex-wrap justify-end gap-2">
          {savedCustomer ? <StatusBadge status={savedCustomer.status} /> : null}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || saveCustomer.isPending}
          >
            <Save className="size-4" />
            Luu nhap
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={
              form.formState.isSubmitting ||
              saveCustomer.isPending ||
              submitCustomer.isPending
            }
            onClick={form.handleSubmit((values) => save(values, true))}
          >
            <Send className="size-4" />
            Trinh duyet
          </Button>
        </div>
      </form>
    </section>
  )
}

function DraftWorkbenchPage() {
  return (
    <section className="space-y-4">
      <Header
        title="Ho so nhap"
        description="Danh sach ho so dang soan, dang cho duyet hoac bi tra ve bo sung tu cac luong nghiep vu."
      />
      <CustomerDraftList
        onOpen={(customer) =>
          navigateTo(
            `/customers/registrations?customerId=${encodeURIComponent(customer.id)}`
          )
        }
      />
    </section>
  )
}

function TaskWorkbenchPage() {
  return (
    <section className="space-y-4">
      <Header
        title="Viec can xu ly"
        description="Hang doi task BPM dung chung cho khach hang, giao dich den, giao dich di va cac luong ve sau."
      />
      <CustomerTaskInbox />
    </section>
  )
}

function FieldGrid({
  fields,
  form,
}: {
  fields: Array<
    [keyof CustomerFormValues, string, "input" | "select" | "textarea" | "date"]
  >
  form: ReturnType<typeof useForm<CustomerFormValues>>
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
    </div>
  )
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
            alt="Avatar khach hang"
            className="h-full w-full object-cover"
            src={getMediaContentUrl(fileId)}
          />
        ) : (
          <div className="px-4 text-center text-sm text-muted-foreground">
            Anh dai dien
          </div>
        )}
      </div>
      <label className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted">
        <Upload className="size-4" />
        {uploading ? "Dang tai" : "Upload"}
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
          Xoa anh
        </Button>
      ) : null}
    </div>
  )
}

function CustomerDraftList({
  onOpen,
}: {
  onOpen: (customer: Customer) => void
}) {
  const draftsQuery = useCustomerDrafts()
  const items = draftsQuery.data ?? []

  return (
    <Panel title="Ho so dang xu ly">
      <div className="mb-4 flex justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={draftsQuery.isFetching}
          onClick={() => void draftsQuery.refetch()}
        >
          Tai lai
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ma khach hang</TableHead>
            <TableHead>Ten khach hang</TableHead>
            <TableHead>Loai</TableHead>
            <TableHead>Trang thai</TableHead>
            <TableHead>So di dong</TableHead>
            <TableHead>CCCD/CMND</TableHead>
            <TableHead className="text-right">Thao tac</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.id}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>{customerTypeLabel(item.customerType)}</TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell>{item.mobile || "-"}</TableCell>
              <TableCell>{item.identityNo || "-"}</TableCell>
              <TableCell className="text-right">
                <Button type="button" size="sm" onClick={() => onOpen(item)}>
                  Mo
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!items.length ? (
            <EmptyTable colSpan={7} text="Chua co ho so nhap dang xu ly." />
          ) : null}
        </TableBody>
      </Table>
    </Panel>
  )
}

function CustomerTaskInbox() {
  const [role, setRole] = useState<WorkflowTaskRole>("CUSTOMER_CHECKER")
  const tasksQuery = useWorkflowTasks(role)
  const completeTask = useCompleteWorkflowTask(role)
  const tasks = tasksQuery.data ?? []

  function complete(task: { jobKey: number; processInstanceKey: number; elementId: string }, decision: string) {
    const variables =
      role === "CUSTOMER_RISK_CHECKER"
        ? { riskDecision: decision }
        : role === "CUSTOMER_CHECKER"
          ? { reviewDecision: decision }
          : { reviewDecision: "APPROVE" }
    completeTask.mutate({
      jobKey: task.jobKey,
      processInstanceKey: task.processInstanceKey,
      elementId: task.elementId,
      variables,
    })
  }

  return (
    <Panel title="Viec can xu ly">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <FormField className="sm:w-72" label="Vai tro xu ly">
          <Select
            value={role}
            onValueChange={(value) => setRole(value as WorkflowTaskRole)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CUSTOMER_CHECKER">Checker</SelectItem>
              <SelectItem value="CUSTOMER_RISK_CHECKER">
                Risk checker
              </SelectItem>
              <SelectItem value="CUSTOMER_MAKER">Maker bo sung</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <Button
          type="button"
          variant="secondary"
          disabled={tasksQuery.isFetching}
          onClick={() => void tasksQuery.refetch()}
        >
          Lay task
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Task</TableHead>
            <TableHead>Ma ho so</TableHead>
            <TableHead>Ma khach hang</TableHead>
            <TableHead>Ten khach hang</TableHead>
            <TableHead>Vai tro</TableHead>
            <TableHead className="text-right">Xu ly</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.jobKey}>
              <TableCell className="font-mono text-xs">{task.type}</TableCell>
              <TableCell>{task.caseCode || task.caseId || "-"}</TableCell>
              <TableCell className="font-mono text-xs">
                {task.customerId || "-"}
              </TableCell>
              <TableCell>{task.customerName || "-"}</TableCell>
              <TableCell>{task.candidateRole || role}</TableCell>
              <TableCell className="space-x-2 text-right">
                {role !== "CUSTOMER_MAKER" ? (
                  <>
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => complete(task, "APPROVE")}
                    >
                      Duyet
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => complete(task, "REQUEST_CHANGES")}
                    >
                      Bo sung
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="destructive"
                      onClick={() => complete(task, "REJECT")}
                    >
                      Tu choi
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    type="button"
                    onClick={() => complete(task, "APPROVE")}
                  >
                    Gui lai
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {!tasks.length ? (
            <EmptyTable colSpan={6} text="Chua co task nao duoc lay." />
          ) : null}
        </TableBody>
      </Table>
    </Panel>
  )
}

function RelationshipsPanel({ customer }: { customer: Customer }) {
  const relationshipsQuery = useCustomerRelationships(customer.id)
  const approvedCustomersQuery = useCustomers({ status: "APPROVED" })
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
    <Panel title="Nguoi co lien quan">
      <form
        className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5"
        onSubmit={submit}
      >
        <FormField
          label="Ma khach hang(*)"
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
                  <SelectValue placeholder="Chon khach hang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Chon khach hang --</SelectItem>
                  {candidates.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.id} - {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
        <FormField
          label="Loai quan he(*)"
          error={form.formState.errors.relationType?.message}
        >
          <Input {...form.register("relationType")} />
        </FormField>
        <FormField
          label="Ma quan he(*)"
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
          label="Ma QH doi ung(*)"
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
          label="Trang thai quan he(*)"
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
            Them moi
          </Button>
        </div>
      </form>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>TT</TableHead>
            <TableHead>Ma khach hang</TableHead>
            <TableHead>Ten khach hang</TableHead>
            <TableHead>Dia chi</TableHead>
            <TableHead>Ten quan he</TableHead>
            <TableHead>Ten quan he doi ung</TableHead>
            <TableHead>Trang thai quan he</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(relationshipsQuery.data ?? []).map((item, index) => (
            <TableRow key={item.id}>
              <TableCell>{index + 1}</TableCell>
              <TableCell className="font-mono text-xs">
                {item.relatedCustomerId}
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
            <EmptyTable colSpan={7} text="Chua co quan he khach hang." />
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
        <SelectItem value="none">-- Chon Ma quan he --</SelectItem>
        {selectOptions.relation.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CustomerTable({
  title,
  mode,
}: {
  title: string
  mode: "profiles" | "risk"
}) {
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const customersQuery = useCustomers({
    q: submittedQuery || undefined,
    riskOnly: mode === "risk",
    status: "APPROVED",
  })
  const items = customersQuery.data ?? []

  return (
    <section className="space-y-4">
      <Header
        title={title}
        description={
          mode === "risk"
            ? "Theo doi khach hang co phan loai rui ro."
            : "Tra cuu ho so khach hang da ghi nhan tren CRM."
        }
      />
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
            placeholder="Tim theo ma, ten, so di dong, CCCD/CMND"
          />
        </div>
        <Button type="submit">
          <Search className="size-4" />
          Tim
        </Button>
      </form>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {mode === "profiles" ? <TableHead>Chon</TableHead> : null}
              <TableHead>TT</TableHead>
              <TableHead>Ma khach hang</TableHead>
              <TableHead>Ten khach hang</TableHead>
              {mode === "profiles" ? (
                <TableHead>Phan khuc khach hang</TableHead>
              ) : null}
              <TableHead>Loai khach hang</TableHead>
              {mode === "profiles" ? (
                <TableHead>Hang khach hang</TableHead>
              ) : (
                <TableHead>Phan loai rui ro</TableHead>
              )}
              <TableHead>So di dong</TableHead>
              <TableHead>CCCD/CMND</TableHead>
              <TableHead>Dia chi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                {mode === "profiles" ? (
                  <TableCell>
                    <input aria-label={`Chon ${item.id}`} type="checkbox" />
                  </TableCell>
                ) : null}
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">{item.id}</TableCell>
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
              </TableRow>
            ))}
            {!items.length ? (
              <EmptyTable
                colSpan={mode === "profiles" ? 10 : 8}
                text="Chua co du lieu khach hang."
              />
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
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
  const variant = status === "APPROVED" ? "default" : "secondary"
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

function optionsFor(name: keyof CustomerFormValues) {
  if (name === "provinceCode") return selectOptions.province
  if (name === "wardCode") return selectOptions.ward
  if (name === "areaCode") return selectOptions.area
  return selectOptions.generic
}

function toPayload(values: CustomerFormValues) {
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

  return {
    id: values.id.trim(),
    customerType: values.customerType,
    name: values.name.trim(),
    email: values.email.trim(),
    status: "DRAFT" as const,
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
}

function toFormValues(customer: Customer): CustomerFormValues {
  const general = customer.generalInfo
  const personal = customer.personalInfo
  const business = customer.businessInfo
  const extended = customer.extendedInfo
  return {
    ...defaultValues,
    id: customer.id,
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
  return value === "BUSINESS" ? "Doanh nghiep" : "Ca nhan"
}

function relationLabel(value: string) {
  return (
    selectOptions.relation.find((item) => item.value === value)?.label ?? value
  )
}

function navigateTo(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

function customerIdFromSearch() {
  return new URLSearchParams(window.location.search).get("customerId")
}

function routeFromPath(pathname: string): CustomerRoute {
  if (pathname.startsWith("/customers/profiles")) return "profiles"
  if (pathname.startsWith("/customers/risk-cases")) return "risk"
  return "registrations"
}

function workbenchRouteFromPath(pathname: string): WorkbenchRoute {
  if (pathname.startsWith("/workbench/tasks")) return "tasks"
  return "drafts"
}
