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
  useCompleteWorkflowTask,
  useWorkbenchCases,
  useWorkflowCaseSearch,
  useWorkflowTasks,
} from "./queries"

type WorkbenchRoute = "drafts" | "incoming" | "outgoing" | "search"

const directionMeta = {
  incoming: {
    title: "Giao dich den",
    description:
      "Danh sach case va user task BPMN cua cac luong giao dich den dang cho xu ly.",
    icon: ArrowDownToLine,
  },
  outgoing: {
    title: "Giao dich di",
    description:
      "Danh sach case va user task BPMN cua cac luong giao dich di dang cho xu ly.",
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
        title="Ho so nhap"
        description="Cac ban nhap chua submit vao BPMN. Khi trinh duyet thanh cong, ho so se thanh case workflow."
      />
      <Panel
        title="Ban nhap nghiep vu"
        action={
          <Button
            type="button"
            variant="secondary"
            disabled={draftsQuery.isFetching}
            onClick={() => void draftsQuery.refetch()}
          >
            <RefreshCw className="size-4" />
            Tai lai
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ma</TableHead>
              <TableHead>Tieu de</TableHead>
              <TableHead>Nghiep vu</TableHead>
              <TableHead>Trang thai</TableHead>
              <TableHead>Cap nhat</TableHead>
              <TableHead className="text-right">Thao tac</TableHead>
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
              <EmptyTable colSpan={6} text="Chua co ban nhap nao." />
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
  const [selectedTaskKey, setSelectedTaskKey] = useState<number>()
  const casesQuery = useWorkbenchCases(direction)
  const tasksQuery = useWorkflowTasks(taskRequest)
  const completeTask = useCompleteWorkflowTask(direction)
  const cases = casesQuery.data ?? []
  const tasks = tasksQuery.data ?? []
  const selectedTask = tasks.find((item) => item.jobKey === selectedTaskKey)
  const selectedCase =
    cases.find((item) => item.id === selectedCaseId) ??
    cases.find((item) => item.caseCode === selectedTask?.caseCode) ??
    cases[0]
  const meta = directionMeta[direction]
  const Icon = meta.icon

  function complete(task: WorkflowTask, action: string) {
    completeTask.mutate({
      jobKey: task.jobKey,
      processInstanceKey: task.processInstanceKey,
      elementId: task.elementId,
      variables: {
        action,
        decision: action,
        reviewDecision: action,
      },
    })
  }

  function openTask(task: WorkflowTask) {
    setSelectedTaskKey(task.jobKey)
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
            <FormField className="w-72" label="Buoc can lay">
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
              Lay task BPMN
            </Button>
          </div>
        }
      >
        <TaskTable
          tasks={tasks}
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
              Tai lai
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
        title="Tim kiem giao dich"
        description="Tra cuu case workflow theo ma, doi tuong, trang thai va chieu giao dich."
      />
      <form
        className="grid gap-3 rounded-md border p-4 md:grid-cols-[minmax(14rem,1fr)_12rem_12rem_auto]"
        onSubmit={(event) => {
          event.preventDefault()
          setParams(draft)
        }}
      >
        <FormField label="Tu khoa">
          <Input
            value={draft.keyword}
            placeholder="Ma case, tieu de, doi tuong"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                keyword: event.target.value,
              }))
            }
          />
        </FormField>
        <FormField label="Chieu giao dich">
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
              <SelectItem value="ALL">Tat ca</SelectItem>
              <SelectItem value="INCOMING">Giao dich den</SelectItem>
              <SelectItem value="OUTGOING">Giao dich di</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Trang thai">
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
              <SelectItem value="ALL">Tat ca</SelectItem>
              <SelectItem value="DRAFT">Nhap</SelectItem>
              <SelectItem value="SUBMITTED">Da gui</SelectItem>
              <SelectItem value="IN_REVIEW">Dang xu ly</SelectItem>
              <SelectItem value="COMPLETED">Hoan tat</SelectItem>
              <SelectItem value="FAILED">Loi</SelectItem>
              <SelectItem value="SUSPENDED">Tam treo</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <Button className="mt-6" type="submit">
          <Search className="size-4" />
          Tim
        </Button>
      </form>
      <Panel title="Ket qua">
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
          <TableHead>Ma case</TableHead>
          <TableHead>Buoc BPMN</TableHead>
          <TableHead>Vai tro</TableHead>
          <TableHead>Form</TableHead>
          <TableHead className="text-right">Xu ly</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.map((task) => (
          <TableRow key={task.jobKey}>
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
                Mo
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={completing}
                onClick={() => onComplete(task, "SUBMIT")}
              >
                <Send className="size-4" />
                Gui
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={completing}
                onClick={() => onComplete(task, "APPROVE")}
              >
                <Check className="size-4" />
                Duyet
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={completing}
                onClick={() => onComplete(task, "REQUEST_CHANGES")}
              >
                <RotateCcw className="size-4" />
                Tra ve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={completing}
                onClick={() => onComplete(task, "REJECT")}
              >
                <X className="size-4" />
                Tu choi
              </Button>
            </TableCell>
          </TableRow>
        ))}
        {!tasks.length ? (
          <EmptyTable
            colSpan={6}
            text="Chua co user task nao. Bam Lay task BPMN khi can nhan viec tu Zeebe."
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
          <TableHead>Ma case</TableHead>
          <TableHead>Tieu de</TableHead>
          <TableHead>Loai</TableHead>
          <TableHead>Trang thai</TableHead>
          <TableHead>Buoc hien tai</TableHead>
          <TableHead>Vai tro</TableHead>
          <TableHead>Cap nhat</TableHead>
          <TableHead className="text-right">Thao tac</TableHead>
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
                  Mo
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
        {!cases.length ? (
          <EmptyTable colSpan={8} text="Chua co case workflow phu hop." />
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
        Chon case hoac task de xem chi tiet.
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
        <Field label="Trang thai" value={item?.status ?? "TASK_ACTIVE"} />
        <Field
          label="Buoc hien tai"
          value={stepLabel(task?.elementId || item?.currentStep || "-")}
        />
        <Field label="Vai tro" value={task?.candidateRole || item?.candidateRole || "-"} />
        <Field label="Nguoi xu ly" value={item?.assignedTo || "Chua gan"} />
        <Field label="Form BPMN" value={task?.formKey || "-"} />
        <Field label="Instance" value={String(task?.processInstanceKey || item?.processInstanceKey || "-")} />
      </div>
      {task ? (
        <div className="rounded-md bg-muted/40 p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Bien task
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

function caseHref(item: WorkflowCase) {
  if (item.caseType === "FINANCE_OUTGOING_TRANSACTION")
    return "/workbench/outgoing-transactions"
  return "/workbench/incoming-transactions"
}

function customerTypeLabel(item: Customer) {
  return item.customerType === "BUSINESS"
    ? "Khach hang doanh nghiep"
    : "Khach hang ca nhan"
}

function caseTypeLabel(value: string) {
  if (value === "FINANCE_INCOMING_TRANSACTION") return "Giao dich den"
  if (value === "FINANCE_OUTGOING_TRANSACTION") return "Giao dich di"
  if (value === "CUSTOMER_REGISTRATION") return "Dang ky khach hang"
  return value
}

function taskLabel(value: string) {
  const labels: Record<string, string> = {
    "workflow.customer_checker_review": "Kiem soat ho so khach hang",
    "workflow.customer_risk_review": "Ra soat rui ro khach hang",
    "workflow.customer_maker_revise": "Maker bo sung ho so",
    "workflow.finance_incoming_classify": "Phan loai giao dich den",
    "workflow.finance_incoming_approve": "Duyet giao dich den",
    "workflow.finance_outgoing_verify": "Kiem tra giao dich di",
    "workflow.finance_outgoing_approve": "Duyet giao dich di",
  }
  return labels[value] ?? value
}

function stepLabel(value: string) {
  const labels: Record<string, string> = {
    submitted: "Da gui",
    Activity_CheckerReview: "Kiem soat ho so khach hang",
    Activity_MakerRevise: "Maker bo sung ho so",
    Activity_RiskReview: "Ra soat rui ro khach hang",
    Activity_ApproveCustomer: "Kich hoat ho so khach hang",
    "classify-account": "Phan loai tai khoan",
    "approve-journal": "Duyet but toan",
    "verify-beneficiary": "Kiem tra nguoi nhan",
    "workflow.finance_incoming_classify": "Phan loai giao dich den",
    "workflow.finance_incoming_approve": "Duyet giao dich den",
    "workflow.finance_outgoing_verify": "Kiem tra giao dich di",
    "workflow.finance_outgoing_approve": "Duyet giao dich di",
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
