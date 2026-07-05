import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Search } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { navigateTo } from "@workspace/core/routing"
import { useCustomers } from "../queries"
import { customerTypeLabel } from "../shared/form-utils"
import { EmptyTable, Header } from "../shared/ui"

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