import { useEffect, useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Eye,
  Search,
  Settings,
  SlidersHorizontal,
} from "lucide-react"
import { z } from "zod"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
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
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
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
import { cn } from "@workspace/ui/lib/utils"
import type {
  AccountingConfigItem,
  FinanceOperation,
  FinanceOperationCase,
  FinanceTransactionSearchParams,
  OperationView,
} from "./api"
import {
  useAccountingConfig,
  useFinanceOperationCases,
  useFinanceTransactionSearch,
} from "./queries"

const operationMeta = {
  incoming: {
    title: "Giao dịch đến",
    description:
      "Tiếp nhận, phân loại tài khoản, xem bút toán dự kiến và theo dõi kết quả hạch toán.",
    icon: ArrowDownToLine,
    empty: "Chưa có giao dịch đến trong hàng đợi này.",
  },
  outgoing: {
    title: "Giao dịch đi",
    description:
      "Kiểm tra thông tin người nhận, phí, hạn mức và kết quả xử lý giao dịch chi.",
    icon: ArrowUpFromLine,
    empty: "Chưa có giao dịch đi trong hàng đợi này.",
  },
} satisfies Record<
  FinanceOperation,
  {
    title: string
    description: string
    icon: typeof ArrowDownToLine
    empty: string
  }
>

const views: { value: OperationView; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "mine", label: "Chờ tôi xử lý" },
  { value: "in_progress", label: "Đang xử lý" },
  { value: "overdue", label: "Quá hạn SLA" },
  { value: "completed", label: "Đã hoàn tất" },
  { value: "suspended", label: "Lỗi hoặc tạm treo" },
]

const statusVariant: Partial<
  Record<string, "default" | "success" | "error" | "warning" | "info">
> = {
  SUBMITTED: "info",
  IN_REVIEW: "warning",
  PENDING_APPROVAL: "warning",
  COMPLETED: "success",
  FAILED: "error",
  SUSPENDED: "error",
  CANCELLED: "default",
}

const searchDefaultValues: FinanceTransactionSearchParams = {
  keyword: "",
  direction: "ALL",
  status: "ALL",
  from: "",
  to: "",
}

const searchSchema = z
  .object({
    keyword: z.string().trim().max(120, "Từ khóa quá dài"),
    direction: z.enum(["ALL", "INCOMING", "OUTGOING"]),
    status: z.string(),
    from: z.string(),
    to: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.from && values.to && values.from > values.to) {
      ctx.addIssue({
        code: "custom",
        message: "Ngày bắt đầu phải trước ngày kết thúc",
        path: ["from"],
      })
    }
  })

type SearchFormValues = z.infer<typeof searchSchema>

export function IncomingTransactionsOperationPage() {
  return <FinanceOperationPage operation="incoming" />
}

export function OutgoingTransactionsOperationPage() {
  return <FinanceOperationPage operation="outgoing" />
}

export function FinanceTransactionSearchPage() {
  const [params, setParams] =
    useState<FinanceTransactionSearchParams>(searchDefaultValues)
  const { data, isLoading } = useFinanceTransactionSearch(params)
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: searchDefaultValues,
  })

  const onSubmit = form.handleSubmit((values) => {
    setParams(values)
  })

  return (
    <FinanceOperationFrame
      active="search"
      title="Tìm kiếm giao dịch"
      description="Tra cứu giao dịch đến và giao dịch đi theo mã hồ sơ, đối tượng, trạng thái và khoảng ngày."
    >
      {data?.source === "mock" ? <MockDataNotice /> : null}
      <form className="rounded-lg border p-4" onSubmit={onSubmit}>
        <div className="grid gap-3 md:grid-cols-[minmax(12rem,1.4fr)_10rem_10rem_9rem_9rem_auto]">
          <FormField
            label="Từ khóa"
            error={form.formState.errors.keyword?.message}
          >
            <Input
              aria-invalid={Boolean(form.formState.errors.keyword)}
              placeholder="Mã hồ sơ, đối tượng, đối tác"
              {...form.register("keyword")}
            />
          </FormField>
          <FormField label="Chiều giao dịch">
            <Controller
              control={form.control}
              name="direction"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả</SelectItem>
                    <SelectItem value="INCOMING">Giao dịch đến</SelectItem>
                    <SelectItem value="OUTGOING">Giao dịch đi</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Trạng thái">
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tất cả</SelectItem>
                    <SelectItem value="SUBMITTED">Đã gửi</SelectItem>
                    <SelectItem value="IN_REVIEW">Đang rà soát</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">Chờ duyệt</SelectItem>
                    <SelectItem value="COMPLETED">Hoàn tất</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField
            label="Từ ngày"
            error={form.formState.errors.from?.message}
          >
            <Input type="date" {...form.register("from")} />
          </FormField>
          <FormField label="Đến ngày">
            <Input type="date" {...form.register("to")} />
          </FormField>
          <Button className="mt-6" type="submit">
            <Search className="size-4" />
            Tìm
          </Button>
        </div>
      </form>
      {isLoading ? <LoadingBlock /> : <CaseTable cases={data?.items ?? []} />}
    </FinanceOperationFrame>
  )
}

export function AccountingConfigPage() {
  const { data, isLoading } = useAccountingConfig()
  const items = data?.items ?? []

  return (
    <FinanceOperationFrame
      active="accounting-config"
      title="Cấu hình kế toán"
      description="Quản lý ánh xạ quy trình, phân loại tài khoản, mẫu bút toán và tài khoản phục vụ hạch toán."
    >
      {data?.source === "mock" ? <MockDataNotice /> : null}
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <Tabs defaultValue="process" className="space-y-3">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="process">Cấu hình quy trình</TabsTrigger>
            <TabsTrigger value="classification">
              Phân loại tài khoản
            </TabsTrigger>
            <TabsTrigger value="journal">Định nghĩa bút toán</TabsTrigger>
            <TabsTrigger value="regulatory">Tài khoản quy định</TabsTrigger>
            <TabsTrigger value="internal">Tài khoản nội bộ</TabsTrigger>
          </TabsList>
          {(
            [
              "process",
              "classification",
              "journal",
              "regulatory",
              "internal",
            ] as const
          ).map((group) => (
            <TabsContent key={group} value={group}>
              <AccountingConfigTable
                items={items.filter((item) => item.group === group)}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </FinanceOperationFrame>
  )
}

function FinanceOperationPage({ operation }: { operation: FinanceOperation }) {
  const [view, setView] = useState<OperationView>("all")
  const { data, isLoading } = useFinanceOperationCases(operation, view)
  const cases = useMemo(() => data?.items ?? [], [data?.items])
  const [selectedId, setSelectedId] = useState<string>()
  const selected = cases.find((item) => item.id === selectedId) ?? cases[0]

  useEffect(() => {
    setSelectedId(undefined)
  }, [operation, view])

  const meta = operationMeta[operation]
  const Icon = meta.icon

  return (
    <FinanceOperationFrame
      active={operation}
      title={meta.title}
      description={meta.description}
    >
      {data?.source === "mock" ? <MockDataNotice /> : null}
      <div className="flex flex-wrap items-center gap-2">
        {views.map((item) => (
          <Button
            key={item.value}
            type="button"
            variant={view === item.value ? "default" : "outline"}
            size="sm"
            onClick={() => setView(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="size-4 text-muted-foreground" />
              <Badge variant="secondary">{cases.length} hồ sơ</Badge>
            </div>
            {cases.length ? (
              <CaseTable cases={cases} onSelect={setSelectedId} />
            ) : (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                {meta.empty}
              </div>
            )}
          </div>
          {selected ? (
            <CaseDetailShell item={selected} readOnly={operation === "outgoing"} />
          ) : null}
        </div>
      )}
    </FinanceOperationFrame>
  )
}

function FinanceOperationFrame({
  active,
  title,
  description,
  children,
}: {
  active: FinanceOperation | "search" | "accounting-config"
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        <OperationNav active={active} />
      </div>
      {children}
    </div>
  )
}

function OperationNav({
  active,
}: {
  active: FinanceOperation | "search" | "accounting-config"
}) {
  const links = [
    {
      key: "incoming",
      href: "/workbench/incoming-transactions",
      label: "Giao dịch đến",
      icon: ArrowDownToLine,
    },
    {
      key: "outgoing",
      href: "/workbench/outgoing-transactions",
      label: "Giao dịch đi",
      icon: ArrowUpFromLine,
    },
    {
      key: "search",
      href: "/workbench/transaction-search",
      label: "Tìm kiếm",
      icon: Search,
    },
    {
      key: "accounting-config",
      href: "/finance/accounting-config",
      label: "Cấu hình",
      icon: Settings,
    },
  ] as const

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Finance operation">
      {links.map((item) => {
        const Icon = item.icon
        return (
          <a
            key={item.key}
            href={item.href}
            className={cn(
              "inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors hover:bg-muted",
              active === item.key
                ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-input bg-background"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}

function CaseTable({
  cases,
  onSelect,
}: {
  cases: FinanceOperationCase[]
  onSelect?: (id: string) => void
}) {
  if (!cases.length) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Không có giao dịch phù hợp.
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Mã hồ sơ</TableHead>
            <TableHead>Đối tượng</TableHead>
            <TableHead>Đối tác</TableHead>
            <TableHead className="text-right">Số tiền</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Bước hiện tại</TableHead>
            <TableHead>SLA</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {cases.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">
                {item.caseCode}
              </TableCell>
              <TableCell className="min-w-48 font-medium">
                {item.primaryObject}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.counterparty}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatMoney(item.amount, item.currency)}
              </TableCell>
              <TableCell>
                <Status variant={statusVariant[item.status] || "default"}>
                  <StatusIndicator />
                  <StatusLabel>{statusLabel(item.status)}</StatusLabel>
                </Status>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.currentStep}
              </TableCell>
              <TableCell>
                <SlaBadge item={item} />
              </TableCell>
              <TableCell className="text-right">
                {onSelect ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelect(item.id)}
                  >
                    <Eye className="size-4" />
                    Mở
                  </Button>
                ) : (
                  <a
                    className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"
                    href={`${item.operation === "incoming"
                      ? "/workbench/incoming-transactions"
                      : "/workbench/outgoing-transactions"
                    }?caseCode=${encodeURIComponent(item.caseCode)}&mode=view`}
                  >
                    <Eye className="size-4" />
                    Mở
                  </a>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function CaseDetailShell({
  item,
  readOnly = false,
}: {
  item: FinanceOperationCase
  readOnly?: boolean
}) {
  const domainTabs =
    item.operation === "incoming"
      ? [
          "Thông tin giao dịch",
          "Phân loại tài khoản",
          "Bút toán dự kiến",
          "Kết quả hạch toán",
        ]
      : [
          "Thông tin giao dịch",
          "Thông tin người nhận",
          "Phí và hạn mức",
          "Bút toán dự kiến",
          "Kết quả xử lý",
        ]

  return (
    <aside className="space-y-3 rounded-lg border p-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">
              {item.caseCode}
            </p>
            <h2 className="text-base font-semibold">{item.primaryObject}</h2>
          </div>
          <SlaBadge item={item} />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <Field label="Trạng thái" value={statusLabel(item.status)} />
          <Field label="Bước" value={item.currentStep} />
          <Field label="Người xử lý" value={item.assignee || "Chưa nhận"} />
          <Field label="Vai trò" value={item.candidateRole} />
          <Field label="Ưu tiên" value={priorityLabel(item.priority)} />
          <Field
            label="Số tiền"
            value={formatMoney(item.amount, item.currency)}
          />
        </div>
        {!readOnly ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" type="button">
            {item.quickAction}
          </Button>
          <Button size="sm" type="button" variant="outline">
            Yêu cầu bổ sung
          </Button>
          <Button size="sm" type="button" variant="outline">
            Tạm treo
          </Button>
        </div>
        ) : null}
      </div>
      <Tabs defaultValue={domainTabs[0]}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          {[
            ...domainTabs,
            "Tài liệu",
            "Ghi chú",
            "Lịch sử",
            "Luồng phê duyệt",
          ].map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        {domainTabs.map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="space-y-2 rounded-md border p-3 text-sm">
              <Field label="Đối tác" value={item.counterparty} />
              <Field label="Kênh" value={item.channel} />
              <Field label="Cập nhật" value={formatDateTime(item.updatedAt)} />
            </div>
          </TabsContent>
        ))}
        {["Tài liệu", "Ghi chú", "Lịch sử", "Luồng phê duyệt"].map((tab) => (
          <TabsContent key={tab} value={tab}>
            <div className="rounded-md border p-3 text-sm text-muted-foreground">
              {tab} sẽ đọc theo case_id và case_type khi workflow-service mở
              API.
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </aside>
  )
}

function AccountingConfigTable({ items }: { items: AccountingConfigItem[] }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        Chưa có cấu hình trong nhóm này.
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>Mã cấu hình</TableHead>
            <TableHead>Tên nghiệp vụ</TableHead>
            <TableHead>Đơn vị sở hữu</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>Cập nhật</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.code}</TableCell>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {item.owner}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{item.status}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.updatedAt}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function MockDataNotice() {
  return (
    <Alert>
      <SlidersHorizontal className="size-4" />
      <AlertTitle>Đang dùng dữ liệu mẫu</AlertTitle>
      <AlertDescription>
        Các endpoint workflow/finance operation chưa sẵn sàng; UI đang chạy bằng
        fallback local trong app finance.
      </AlertDescription>
    </Alert>
  )
}

function LoadingBlock() {
  return (
    <div className="flex justify-center rounded-lg border p-8">
      <Spinner className="size-6" />
    </div>
  )
}

function SlaBadge({ item }: { item: FinanceOperationCase }) {
  const variant =
    item.slaState === "OVERDUE"
      ? "destructive"
      : item.slaState === "DUE_SOON"
        ? "secondary"
        : "outline"

  return (
    <Badge variant={variant}>
      {slaLabel(item.slaState)} · {formatDateTime(item.slaDueAt)}
    </Badge>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium break-words">{value}</p>
    </div>
  )
}

function formatMoney(value: string, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    SUBMITTED: "Đã gửi",
    IN_REVIEW: "Đang rà soát",
    PENDING_APPROVAL: "Chờ duyệt",
    COMPLETED: "Hoàn tất",
    FAILED: "Lỗi",
    SUSPENDED: "Tạm treo",
    CANCELLED: "Đã hủy",
  }
  return labels[status] ?? status
}

function slaLabel(status: FinanceOperationCase["slaState"]) {
  const labels: Record<FinanceOperationCase["slaState"], string> = {
    ON_TIME: "Trong hạn",
    DUE_SOON: "Sắp đến hạn",
    OVERDUE: "Quá hạn",
    DONE: "Đã xong",
  }
  return labels[status]
}

function priorityLabel(priority: FinanceOperationCase["priority"]) {
  const labels: Record<FinanceOperationCase["priority"], string> = {
    LOW: "Thấp",
    NORMAL: "Bình thường",
    HIGH: "Cao",
  }
  return labels[priority]
}
