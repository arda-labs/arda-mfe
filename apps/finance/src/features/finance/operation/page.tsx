import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
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
  const { t } = useI18n()
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
          {t("finance.operation.title")}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t("finance.operation.description")}
        </p>
      </div>
      {loading ? (
        <LoadingBlock />
      ) : (
        <Tabs defaultValue="process" className="space-y-3">
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="process">
              {t("finance.operation.tab.process")}
            </TabsTrigger>
            <TabsTrigger value="classification">
              {t("finance.operation.tab.classification")}
            </TabsTrigger>
            <TabsTrigger value="journal">
              {t("finance.operation.tab.journal")}
            </TabsTrigger>
            <TabsTrigger value="regulatory">
              {t("finance.operation.tab.regulatory")}
            </TabsTrigger>
            <TabsTrigger value="internal">
              {t("finance.operation.tab.internal")}
            </TabsTrigger>
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
  const { t, formatDate } = useI18n()
  if (!items.length) {
    return (
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        {t("finance.operation.empty")}
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow>
            <TableHead>{t("finance.operation.col.code")}</TableHead>
            <TableHead>{t("finance.operation.col.name")}</TableHead>
            <TableHead>{t("finance.operation.col.owner")}</TableHead>
            <TableHead>{t("finance.operation.col.status")}</TableHead>
            <TableHead>{t("finance.operation.col.updated")}</TableHead>
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
                {formatDate(item.updatedAt, {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
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
