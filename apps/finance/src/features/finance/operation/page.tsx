import { useEffect, useState } from "react"
import { Badge } from "@workspace/ui/components/badge"
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
import { Spinner } from "@workspace/ui/components/spinner"
import type { AccountingConfigItem } from "./api"
import { financeOperationApi } from "./api"

/** Accounting configuration: process mappings, classifications, journal
 * definitions, named accounts. Legacy incoming/outgoing transaction UI was
 * removed in the Phase 0 rebuild — posting is journal-first (PostingService). */
export function AccountingConfigPage() {
  const [result, setResult] = useState<{ items: AccountingConfigItem[] }>({
    items: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void financeOperationApi
      .listAccountingConfig()
      .then((nextResult) => {
        if (!cancelled) setResult(nextResult)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const items = result?.items ?? []

  return (
    <div className="space-y-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-normal">
          Cấu hình kế toán
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Quản lý ánh xạ quy trình, phân loại tài khoản, mẫu bút toán và tài
          khoản phục vụ hạch toán.
        </p>
      </div>
      {loading ? (
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
    </div>
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

function LoadingBlock() {
  return (
    <div className="flex justify-center rounded-lg border p-8">
      <Spinner className="size-6" />
    </div>
  )
}
