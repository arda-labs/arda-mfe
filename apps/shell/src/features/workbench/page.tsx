import { useState, type ReactNode } from "react"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Eye,
  FileText,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  X,
} from "lucide-react"
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
import { notify } from "@workspace/notifications/notify"
import type { Customer } from "../customers/api"
import { useCustomerDrafts } from "../customers/queries"
import {
  taskTypesByDirection,
  type WorkbenchDirection,
  type WorkbenchSearchDirection,
  type WorkflowCase,
  type WorkflowCaseSearchParams,
  type WorkflowTask,
  type WorkflowTaskRequest,
} from "./api"
import {
  useClaimWorkflowTask,
  useCompleteWorkflowTask,
  useWorkbenchCases,
  useWorkflowCaseSearch,
  useWorkflowTasks,
} from "./queries"

type WorkbenchRoute = "drafts" | "incoming" | "outgoing" | "search"

const directionMeta = {
  incoming: {
    title: "Giao dịch đến",
    description:
      "Danh sách case và user task BPMN của các luồng giao dịch đến đang chờ xử lý.",
    icon: ArrowDownToLine,
  },
  outgoing: {
    title: "Giao dịch đi",
    description:
      "Danh sách case và user task BPMN của các luồng giao dịch đi đang chờ xử lý.",
    icon: ArrowUpFromLine,
  },
} satisfies Record<
  WorkbenchDirection,
  {
    title: string
    description: string
    icon: typeof ArrowDownToLine
  }
>

const defaultSearch: WorkflowCaseSearchParams = {
  keyword: "",
  direction: "ALL",
  status: "ALL",
}

export function WorkbenchPage({ pathname }: { pathname: string }) {
  const route = routeFromPath(pathname)
  if (route === "incoming") return <TransactionWorkbench direction="incoming" />
  if (route === "outgoing") return <TransactionWorkbench direction="outgoing" />
  if (route === "search") return <TransactionSearchPage />
  return <DraftWorkbenchPage />
}

function DraftWorkbenchPage() {
  const draftsQuery = useCustomerDrafts()
  const items = draftsQuery.data ?? []

  return (
    <section className="space-y-4">
      <Header
        title="Hồ sơ nhập"
        description="Các bản nháp chưa submit vào BPMN. Khi trình duyệt thành công, hồ sơ sẽ thành case workflow."
      />
      <Panel
        title="Bản nháp nghiệp vụ"
        action={
          <Button
            type="button"
            variant="secondary"
            disabled={draftsQuery.isFetching}
            onClick={() => void draftsQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Tải lại
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ma</TableHead>
              <TableHead>Tiêu đề</TableHead>
              <TableHead>Nghiệp vụ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Cập nhật</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs">{item.id}</TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{customerTypeLabel(item)}</TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      navigateTo(
                        `/customers/registrations?customerId=${encodeURIComponent(item.id)}`
                      )
                    }
                  >
                    <Eye className="size-4" />
                    Mo
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!items.length ? (
              <EmptyTable colSpan={6} text="Chưa có bản nháp nào." />
            ) : null}
          </TableBody>
        </Table>
      </Panel>
    </section>
  )
}

function TransactionWorkbench({
  direction,
}: {
  direction: WorkbenchDirection
}) {
  const [taskRequest, setTaskRequest] = useState<WorkflowTaskRequest>(
    taskTypesByDirection[direction][0]
  )
  const [selectedCaseId, setSelectedCaseId] = useState<string>()
  const [claimedTask, setClaimedTask] = useState<WorkflowTask>()
  const casesQuery = useWorkbenchCases(direction)
  const tasksQuery = useWorkflowTasks(taskRequest)
  const claimTask = useClaimWorkflowTask(direction)
  const completeTask = useCompleteWorkflowTask(direction)
  const cases = casesQuery.data ?? []
  const tasks = tasksQuery.data ?? []
  const requestedCaseCode = new URLSearchParams(window.location.search).get("caseCode")
  const selectedTask = claimedTask
  const selectedCase =
    cases.find((item) => item.id === selectedCaseId) ??
    cases.find((item) => item.caseCode === selectedTask?.caseCode) ??
    cases.find((item) => item.caseCode === requestedCaseCode) ??
    cases[0]
  const meta = directionMeta[direction]
  const Icon = meta.icon

  function claim() {
    claimTask.mutate(taskRequest, {
      onSuccess: setClaimedTask,
    })
  }

  function complete(task: WorkflowTask, action: string) {
    if (!task.jobKey || !task.processInstanceKey || !task.elementId) {
      notify.error("Hãy nhận task trước khi xử lý")
      return
    }
    completeTask.mutate(
      {
        jobKey: task.jobKey,
        processInstanceKey: task.processInstanceKey,
        elementId: task.elementId,
        variables: {
          action,
          decision: action,
          reviewDecision: action,
        },
      },
      { onSuccess: () => setClaimedTask(undefined) }
    )
  }

  function openTask(task: WorkflowTask) {
    if (customerIdFromTask(task)) {
      navigateTo(taskHref(task))
      return
    }
    if (task.caseCode) {
      navigateTo(caseCodeHref(direction, task.caseCode))
      return
    }
    if (task.formKey) {
      notify.info("Form BPMN", task.formKey)
    }
  }

  return (
    <section className="space-y-4">
      <Header title={meta.title} description={meta.description} />
      <Panel
        title="User task BPMN"
        action={
          <div className="flex flex-wrap items-end gap-2">
            <FormField className="w-72" label="Bước cần lấy">
              <Select
                value={taskRequest.taskType}
                onValueChange={(value) => {
                  const next =
                    taskTypesByDirection[direction].find(
                      (item) => item.taskType === value
                    ) ?? taskTypesByDirection[direction][0]
                  setTaskRequest(next)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taskTypesByDirection[direction].map((item) => (
                    <SelectItem key={item.taskType} value={item.taskType}>
                      {taskLabel(item.taskType)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <Button
              type="button"
              variant="secondary"
              disabled={tasksQuery.isFetching}
              onClick={() => void tasksQuery.refetch()}
            >
              <RefreshCw className="size-4" />
              Tải danh sách
            </Button>
            <Button
              type="button"
              disabled={claimTask.isPending}
              onClick={claim}
            >
              <Send className="size-4" />
              Nhận việc
            </Button>
          </div>
        }
      >
        <TaskTable
          tasks={taskRows(claimedTask, tasks)}
          role={taskRequest.role}
          completing={completeTask.isPending}
          onOpen={openTask}
          onComplete={complete}
        />
      </Panel>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel
          title="Case workflow"
          action={
            <Button
              type="button"
              variant="secondary"
              disabled={casesQuery.isFetching}
              onClick={() => void casesQuery.refetch()}
            >
              <RefreshCw className="size-4" />
              Tải lại
            </Button>
          }
        >
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Icon className="size-4" />
            <span>{cases.length} case</span>
          </div>
          <CaseTable cases={cases} onSelect={setSelectedCaseId} />
        </Panel>
        <CaseDetail task={selectedTask} item={selectedCase} />
      </div>
    </section>
  )
}

function TransactionSearchPage() {
  const [draft, setDraft] = useState(defaultSearch)
  const [params, setParams] = useState(defaultSearch)
  const searchQuery = useWorkflowCaseSearch(params)

  return (
    <section className="space-y-4">
      <Header
        title="Tìm kiếm giao dịch"
        description="Tra cứu case workflow theo mã, đối tượng, trạng thái và chiều giao dịch."
      />
      <form
        className="grid gap-3 rounded-md border p-4 md:grid-cols-[minmax(14rem,1fr)_12rem_12rem_auto]"
        onSubmit={(event) => {
          event.preventDefault()
          setParams(draft)
        }}
      >
        <FormField label="Từ khóa">
          <Input
            value={draft.keyword}
            placeholder="Mã case, tiêu đề, đối tượng"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                keyword: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField label="Chiều giao dịch">
          <Select
            value={draft.direction}
            onValueChange={(value) =>
              setDraft((current) => ({
                ...current,
                direction: value as WorkbenchSearchDirection,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="INCOMING">Giao dịch đến</SelectItem>
              <SelectItem value="OUTGOING">Giao dịch đi</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Trạng thái">
          <Select
            value={draft.status}
            onValueChange={(value) =>
              setDraft((current) => ({ ...current, status: value }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tất cả</SelectItem>
              <SelectItem value="DRAFT">Nháp</SelectItem>
              <SelectItem value="SUBMITTED">Đã gửi</SelectItem>
              <SelectItem value="IN_REVIEW">Đang xử lý</SelectItem>
              <SelectItem value="COMPLETED">Hoàn tất</SelectItem>
              <SelectItem value="FAILED">Lỗi</SelectItem>
              <SelectItem value="SUSPENDED">Tạm treo</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <Button className="mt-6" type="submit">
          <Search className="size-4" />
          Tìm
        </Button>
      </form>
      <Panel title="Kết quả">
        <CaseTable cases={searchQuery.data ?? []} />
      </Panel>
    </section>
  )
}

function TaskTable({
  tasks,
  role,
  completing,
  onOpen,
  onComplete,
}: {
  tasks: WorkflowTask[]
  role: string
  completing: boolean
  onOpen: (task: WorkflowTask) => void
  onComplete: (task: WorkflowTask, action: string) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Task</TableHead>
          <TableHead>Mã case</TableHead>
          <TableHead>Bước BPMN</TableHead>
          <TableHead>Vai trò</TableHead>
          <TableHead>Form</TableHead>
          <TableHead className="text-right">Xử lý</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.jobKey ?? `${task.caseId}-${task.type}`}>
            <TableCell className="font-mono text-xs">{task.type}</TableCell>
            <TableCell>{task.caseCode || task.caseId || "-"}</TableCell>
            <TableCell>{task.elementId}</TableCell>
            <TableCell>{task.candidateRole || role}</TableCell>
            <TableCell>{task.formKey || "-"}</TableCell>
            <TableCell className="space-x-2 text-right">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpen(task)}
              >
                <Eye className="size-4" />
                Mở
              </Button>
              {task.jobKey ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={completing}
                    onClick={() => onComplete(task, "SUBMIT")}
                  >
                    <Send className="size-4" />
                    Gửi
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={completing}
                    onClick={() => onComplete(task, "APPROVE")}
                  >
                    <Check className="size-4" />
                    Duyệt
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={completing}
                    onClick={() => onComplete(task, "REQUEST_CHANGES")}
                  >
                    <RotateCcw className="size-4" />
                    Trả về
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={completing}
                    onClick={() => onComplete(task, "REJECT")}
                  >
                    <X className="size-4" />
                    Từ chối
                  </Button>
                </>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
        {!tasks.length ? (
          <EmptyTable
            colSpan={6}
            text="Chưa có task/case nào phù hợp. Bấm Nhận việc để lấy task tiếp theo từ Zeebe."
          />
        ) : null}
      </TableBody>
    </Table>
  )
}

function CaseTable({
  cases,
  onSelect,
}: {
  cases: WorkflowCase[]
  onSelect?: (id: string) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Mã case</TableHead>
          <TableHead>Tiêu đề</TableHead>
          <TableHead>Loại</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Bước hiện tại</TableHead>
          <TableHead>Vai trò</TableHead>
          <TableHead>Cập nhật</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.caseCode}</TableCell>
            <TableCell className="min-w-52 font-medium">{item.title}</TableCell>
            <TableCell>{caseTypeLabel(item.caseType)}</TableCell>
            <TableCell>
              <StatusBadge status={item.status} />
            </TableCell>
            <TableCell>{stepLabel(item.currentStep)}</TableCell>
            <TableCell>{item.candidateRole || "-"}</TableCell>
            <TableCell>{formatDateTime(item.updatedAt)}</TableCell>
            <TableCell className="text-right">
              {onSelect ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onSelect(item.id)}
                >
                  <Eye className="size-4" />
                  Xem
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => navigateTo(caseHref(item))}
                >
                  <Eye className="size-4" />
                  Mở
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
        {!cases.length ? (
          <EmptyTable colSpan={8} text="Chưa có case workflow phù hợp." />
        ) : null}
      </TableBody>
    </Table>
  )
}

function CaseDetail({
  item,
  task,
}: {
  item?: WorkflowCase
  task?: WorkflowTask
}) {
  if (!item && !task) {
    return (
      <aside className="rounded-md border p-4 text-sm text-muted-foreground">
        Chọn case hoặc task để xem chi tiết.
      </aside>
    )
  }

  return (
    <aside className="space-y-3 rounded-md border p-4">
      <div className="space-y-1">
        <p className="font-mono text-xs text-muted-foreground">
          {item?.caseCode || task?.caseCode || task?.caseId}
        </p>
        <h2 className="text-base font-semibold">
          {item?.title || task?.type || "User task BPMN"}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Trạng thái" value={item?.status ?? "TASK_ACTIVE"} />
        <Field
          label="Bước hiện tại"
          value={stepLabel(task?.elementId || item?.currentStep || "-")}
        />
        <Field label="Vai trò" value={task?.candidateRole || item?.candidateRole || "-"} />
        <Field label="Người xử lý" value={item?.assignedTo || "Chưa gán"} />
        <Field label="Form BPMN" value={task?.formKey || "-"} />
        <Field label="Instance" value={String(task?.processInstanceKey || item?.processInstanceKey || "-")} />
      </div>
      {task ? (
        <div className="rounded-md bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Biến task
          </p>
          <pre className="max-h-72 overflow-auto text-xs">
            {JSON.stringify(task.variables, null, 2)}
          </pre>
        </div>
      ) : null}
    </aside>
  )
}

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3 rounded-md border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="break-words font-medium">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "COMPLETED" || status === "APPROVED"
      ? "default"
      : status === "FAILED" || status === "REJECTED"
        ? "destructive"
        : "secondary"
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

function routeFromPath(pathname: string): WorkbenchRoute {
  if (pathname.startsWith("/workbench/incoming-transactions")) return "incoming"
  if (pathname.startsWith("/workbench/outgoing-transactions")) return "outgoing"
  if (pathname.startsWith("/workbench/transaction-search")) return "search"
  return "drafts"
}

function taskRows(claimedTask: WorkflowTask | undefined, tasks: WorkflowTask[]) {
  if (!claimedTask) return tasks
  return [claimedTask, ...tasks.filter((task) => task.caseId !== claimedTask.caseId)]
}

function caseHref(item: WorkflowCase) {
  if (item.caseType === "CUSTOMER_REGISTRATION" && item.primaryObjectId) {
    const search = new URLSearchParams({
      customerId: item.primaryObjectId,
      caseId: item.id,
      caseCode: item.caseCode,
    })
    return `/customers/registrations?${search.toString()}`
  }
  return caseCodeHref(
    item.caseType === "FINANCE_OUTGOING_TRANSACTION" ? "outgoing" : "incoming",
    item.caseCode
  )
}

function taskHref(task: WorkflowTask) {
  const search = new URLSearchParams({
    customerId: customerIdFromTask(task),
    caseId: textVariable(task, "caseId") || task.caseId,
    caseCode: textVariable(task, "caseCode") || task.caseCode,
    taskKey: String(task.jobKey ?? ""),
    processInstanceKey: String(task.processInstanceKey ?? ""),
    elementId: task.elementId,
    role: task.candidateRole,
  })
  return `/customers/registrations?${search.toString()}`
}

function customerIdFromTask(task: WorkflowTask) {
  return task.customerId || textVariable(task, "customerId") || textVariable(task, "primaryObjectId")
}

function textVariable(task: WorkflowTask, key: string) {
  const value = task.variables[key]
  return typeof value === "string" ? value : ""
}

function caseCodeHref(direction: WorkbenchDirection, caseCode: string) {
  const path =
    direction === "outgoing"
      ? "/workbench/outgoing-transactions"
      : "/workbench/incoming-transactions"
  return `${path}?caseCode=${encodeURIComponent(caseCode)}`
}

function customerTypeLabel(item: Customer) {
  return item.customerType === "BUSINESS"
    ? "Khách hàng doanh nghiệp"
    : "Khách hàng cá nhân"
}

function caseTypeLabel(value: string) {
  if (value === "FINANCE_INCOMING_TRANSACTION") return "Giao dịch đến"
  if (value === "FINANCE_OUTGOING_TRANSACTION") return "Giao dịch đi"
  if (value === "CUSTOMER_REGISTRATION") return "Đăng ký khách hàng"
  return value
}

function taskLabel(value: string) {
  const labels: Record<string, string> = {
    "workflow.customer_checker_review": "Kiểm soát hồ sơ khách hàng",
    "workflow.customer_risk_review": "Rà soát rủi ro khách hàng",
    "workflow.customer_maker_revise": "Maker bổ sung hồ sơ",
    "workflow.finance_incoming_classify": "Phân loại giao dịch đến",
    "workflow.finance_incoming_approve": "Duyệt giao dịch đến",
    "workflow.finance_outgoing_verify": "Kiểm tra giao dịch đi",
    "workflow.finance_outgoing_approve": "Duyệt giao dịch đi",
  }
  return labels[value] ?? value
}

function stepLabel(value: string) {
  const labels: Record<string, string> = {
    submitted: "Đã gửi",
    Activity_CheckerReview: "Kiểm soát hồ sơ khách hàng",
    Activity_MakerRevise: "Maker bổ sung hồ sơ",
    Activity_RiskReview: "Rà soát rủi ro khách hàng",
    Activity_ApproveCustomer: "Kích hoạt hồ sơ khách hàng",
    "classify-account": "Phân loại tài khoản",
    "approve-journal": "Duyệt bút toán",
    "verify-beneficiary": "Kiểm tra người nhận",
    "workflow.finance_incoming_classify": "Phân loại giao dịch đến",
    "workflow.finance_incoming_approve": "Duyệt giao dịch đến",
    "workflow.finance_outgoing_verify": "Kiểm tra giao dịch đi",
    "workflow.finance_outgoing_approve": "Duyệt giao dịch đi",
  }
  return labels[value] ?? value
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function navigateTo(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
