import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import { textSearchMeta } from "@workspace/list-page/column-filters"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import type { Customer } from "../../api"
import { customerTypeLabel } from "../utils/form-utils"

export type CustomerListMode = "profiles" | "risk"

/** Width of the trailing print/adjust column: two labelled buttons need more
 * than the shared `actions` id, which `normalizeSelectColumn` pins to 72px. */
const ROW_ACTIONS_SIZE = 220

export function useCustomerColumns({
  mode,
  onPrint,
  onAdjust,
}: {
  mode: CustomerListMode
  onPrint: (item: Customer) => void
  onAdjust: (item: Customer) => void
}): ColumnDef<Customer>[] {
  const { t } = useI18n()

  return useMemo<ColumnDef<Customer>[]>(() => {
    const isProfiles = mode === "profiles"
    const columns: ColumnDef<Customer>[] = []

    // Row selection is preserved from the legacy list (tick a profile row).
    // It drives the "selected rows" export scope in ListTableToolbar.
    if (isProfiles) {
      columns.push({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label={t("common.action.select_all")}
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t("common.action.select_row")}
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      })
    }

    columns.push(
      {
        id: "customer_code",
        accessorKey: "customerCode",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("crm.customers.columns.customer_code")}
          />
        ),
        // Toolbar text filter; the list contract remaps it to the API `q`
        // parameter (code / name / mobile / identity number / id).
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("crm.customers.columns.customer_code"),
          t("crm.customers.search_placeholder")
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.customerCode || row.original.id}
          </span>
        ),
      },
      {
        id: "customer_name",
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("crm.customers.columns.customer_name")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),
      }
    )

    if (isProfiles) {
      columns.push({
        id: "segment",
        accessorKey: "segment",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("crm.customers.columns.segment")}
          />
        ),
        cell: ({ row }) => <span>{row.original.segment || "-"}</span>,
      })
    }

    columns.push({
      id: "customer_type",
      accessorKey: "customerType",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          label={t("crm.customers.columns.customer_type")}
        />
      ),
      cell: ({ row }) => (
        <span>{customerTypeLabel(row.original.customerType, t)}</span>
      ),
    })

    columns.push(
      isProfiles
        ? {
            id: "rank",
            accessorKey: "rank",
            header: ({ column }) => (
              <DataTableColumnHeader
                column={column}
                label={t("crm.customers.columns.rank")}
              />
            ),
            cell: ({ row }) => <span>{row.original.rank || "-"}</span>,
          }
        : {
            id: "risk_level",
            accessorKey: "riskLevel",
            header: ({ column }) => (
              <DataTableColumnHeader
                column={column}
                label={t("crm.customers.columns.risk_level")}
              />
            ),
            cell: ({ row }) => <span>{row.original.riskLevel || "-"}</span>,
          },
      {
        id: "mobile",
        accessorKey: "mobile",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("crm.customers.columns.mobile")}
          />
        ),
        cell: ({ row }) => <span>{row.original.mobile || "-"}</span>,
      },
      {
        id: "identity_no",
        accessorKey: "identityNo",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("crm.customers.columns.identity_no")}
          />
        ),
        cell: ({ row }) => <span>{row.original.identityNo || "-"}</span>,
      },
      {
        id: "address",
        accessorKey: "address",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("crm.customers.columns.address")}
          />
        ),
        cell: ({ row }) => (
          <span className="block truncate">{row.original.address || "-"}</span>
        ),
      }
    )

    if (isProfiles) {
      columns.push({
        id: "row_actions",
        size: ROW_ACTIONS_SIZE,
        minSize: 180,
        header: () => (
          <div className="text-right">{t("crm.common.actions")}</div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onPrint(row.original)}
            >
              {t("crm.customers.print.action")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onAdjust(row.original)}
            >
              {t("crm.customers.adjustments.action")}
            </Button>
          </div>
        ),
      })
    }

    return columns
  }, [mode, onAdjust, onPrint, t])
}
