import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import {
  multiSelectFilterMeta,
  selectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { AUDIT_EVENT_TYPES, AUDIT_RESULTS } from "../list-query"
import type { AuditEvent } from "../types"

const RESULT_VARIANTS: Partial<
  Record<string, "default" | "success" | "error" | "warning" | "info">
> = {
  success: "success",
  failure: "error",
  denied: "error",
  blocked: "warning",
}

/**
 * Column definitions for the audit server list. Only `timestamp` is sortable
 * (the iam-service query supports no other sort key); the other columns keep
 * the header menu for hiding but render a plain label instead of a dead sort
 * control.
 */
export function useAuditColumns(): ColumnDef<AuditEvent>[] {
  const { t, formatDate } = useI18n()

  return useMemo<ColumnDef<AuditEvent>[]>(
    () => [
      {
        id: "timestamp",
        accessorKey: "timestamp",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.audit.time")}
          />
        ),
        cell: ({ row }) => (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {row.original.timestamp ? formatDate(row.original.timestamp) : "-"}
          </span>
        ),
      },
      {
        id: "subject",
        accessorKey: "subject",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.audit.subject")}
          />
        ),
        enableSorting: false,
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("admin.audit.subject"),
          t("admin.audit.search_subject")
        ),
        cell: ({ row }) => (
          <span className="block max-w-40 truncate">
            {row.original.subject || "-"}
          </span>
        ),
      },
      {
        id: "eventType",
        accessorKey: "eventType",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.audit.type")}
          />
        ),
        enableSorting: false,
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(
          t("admin.audit.type"),
          AUDIT_EVENT_TYPES.map((value) => ({
            value,
            label: t(`admin.audit.event_type.${value}`),
          }))
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.eventType || "-"}
          </span>
        ),
      },
      {
        accessorKey: "action",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.audit.action")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => row.original.action || "-",
      },
      {
        accessorKey: "resource",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.audit.resource")}
          />
        ),
        enableSorting: false,
        cell: ({ row }) => row.original.resource || "-",
      },
      {
        id: "result",
        accessorKey: "result",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("admin.audit.result")}
          />
        ),
        enableSorting: false,
        enableColumnFilter: true,
        meta: selectFilterMeta(
          t("admin.audit.result"),
          AUDIT_RESULTS.map((value) => ({
            value,
            label: t(`admin.audit.result_value.${value}`),
          }))
        ),
        cell: ({ row }) => (
          <Status variant={RESULT_VARIANTS[row.original.result] || "default"}>
            <StatusIndicator />
            <StatusLabel>{row.original.result || "-"}</StatusLabel>
          </Status>
        ),
      },
      {
        accessorKey: "clientIp",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} label="IP" />
        ),
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {row.original.clientIp || "-"}
          </span>
        ),
      },
    ],
    [formatDate, t]
  )
}
