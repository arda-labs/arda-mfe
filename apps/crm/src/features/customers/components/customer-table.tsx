import { useCallback } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { navigateTo } from "@workspace/ui/shell/routing"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { useServerDataTable } from "@workspace/list-page/server-data-table"
import { customerApi, type Customer } from "../../api"
import { printDossier } from "../../../lib/print-dossier"
import { customerTypeLabel } from "../utils/form-utils"
import {
  customerProfilesListDefinition,
  customerRiskListDefinition,
} from "../list-query"
import { useCustomerColumns, type CustomerListMode } from "./customer-columns"

/**
 * Customer record list for `/customers/profiles` (mode=profiles) and
 * `/customers/risk-cases` (mode=risk).
 *
 * The list is the whole page, so it uses the shared `ListPageShell` server-list
 * tier: page/perPage and the toolbar text filter live in the URL, the filter
 * maps to the BE `q` search (code/name/mobile/identity/id) and pagination is
 * server-side (`total` from the list envelope).
 *
 * `riskOnly` comes from the route, not the URL — the workbench links to two
 * distinct paths — and each route has its own query key so their caches can
 * never answer for each other. Sorting is not exposed: the endpoint always
 * orders by `updated_at DESC` and ignores `sort`/`order`.
 */
export function CustomerTable({
  title,
  description,
  mode,
}: {
  title: string
  description: string
  mode: CustomerListMode
}) {
  const { t } = useI18n()

  const printRow = useCallback(
    (item: Customer) => {
      const ok = printDossier({
        title: t("crm.customers.print.title"),
        subtitle: item.customerCode || item.id,
        fields: [
          {
            label: t("crm.customers.columns.customer_code"),
            value: item.customerCode || item.id,
          },
          {
            label: t("crm.customers.columns.customer_name"),
            value: item.name,
          },
          {
            label: t("crm.customers.columns.customer_type"),
            value: customerTypeLabel(item.customerType, t),
          },
          {
            label: t("crm.customers.columns.segment"),
            value: item.segment || "-",
          },
          {
            label: t("crm.customers.columns.rank"),
            value: item.rank || "-",
          },
          {
            label: t("crm.customers.columns.mobile"),
            value: item.mobile || "-",
          },
          {
            label: t("crm.customers.columns.identity_no"),
            value: item.identityNo || "-",
          },
          {
            label: t("crm.customers.columns.address"),
            value: item.address || "-",
          },
        ],
        signatures: [
          t("crm.customers.print.customer"),
          t("crm.customers.print.officer"),
        ],
      })
      if (!ok) notify.error(t("crm.customers.print.blocked"))
    },
    [t]
  )

  const adjustRow = useCallback((item: Customer) => {
    navigateTo(
      `/customers/adjustments?customerId=${encodeURIComponent(item.id)}`
    )
  }, [])

  const columns = useCustomerColumns({
    mode,
    onPrint: printRow,
    onAdjust: adjustRow,
  })

  const definition =
    mode === "risk"
      ? customerRiskListDefinition
      : customerProfilesListDefinition
  const {
    table,
    total,
    isLoading,
    isFetching,
    error: listError,
    refetch,
  } = useServerDataTable<Customer>({
    ...definition,
    columns,
    queryFn: async (query) =>
      customerApi.list({
        page: query.page,
        perPage: query.perPage,
        q: query.q === undefined ? undefined : String(query.q),
        status: "ACTIVE",
        riskOnly: mode === "risk" ? true : undefined,
      }),
    tableOptions: { rowIndexLabel: t("crm.common.index") },
  })

  return (
    <ListPageShell
      title={title}
      header={
        <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
      }
      totalRows={total}
      meta={
        <Badge
          variant="secondary"
          className="px-2.5 py-0.5 text-[10px] font-bold"
        >
          {t("crm.customers.count", { count: total })}
        </Badge>
      }
      criticalPending={isLoading}
      criticalError={listError}
      onRetry={() => void refetch()}
      loadErrorTitle={t("crm.customers.load_failed")}
      fetching={isFetching}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          exportFilename={title}
          sheetName={title}
          totalRowsCount={total}
        />
      }
    />
  )
}
