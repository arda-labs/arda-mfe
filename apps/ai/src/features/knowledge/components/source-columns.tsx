import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useI18n } from "@workspace/i18n"
import {
  multiSelectFilterMeta,
  textSearchMeta,
} from "@workspace/list-page/column-filters"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { DataTableColumnHeader } from "@workspace/ui/components/data-table/data-table-column-header"
import { Eye } from "lucide-react"
import type { SourceOut } from "../api"
import { VersionStatusBadge } from "./source-detail"

const SCOPES = ["tenant", "global", "system"] as const
const VERSION_STATUSES = [
  "DRAFT",
  "APPROVED",
  "INDEXING",
  "PUBLISHED",
  "FAILED",
] as const

/** Column defs for the knowledge corpus (`/ai/knowledge`) — client tier list. */
export function useSourceColumns({
  onOpen,
}: {
  onOpen: (source: SourceOut) => void
}): ColumnDef<SourceOut>[] {
  const { t, formatDate } = useI18n()

  return useMemo<ColumnDef<SourceOut>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.knowledge.field.title")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("ai.knowledge.field.title"),
          t("ai.knowledge.placeholder.search")
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
        ),
      },
      {
        id: "classification",
        accessorKey: "classification",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.knowledge.field.classification")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("ai.knowledge.field.classification"),
          t("ai.knowledge.field.classification")
        ),
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="text-[10px] font-semibold tracking-wider uppercase"
          >
            {row.original.classification || "internal"}
          </Badge>
        ),
      },
      {
        id: "scope",
        accessorKey: "scope",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.knowledge.field.scope")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(
          t("ai.knowledge.field.scope"),
          SCOPES.map((scope) => ({
            label: t(`ai.knowledge.scope.${scope}`),
            value: scope,
          }))
        ),
        cell: ({ row }) => t(`ai.knowledge.scope.${row.original.scope}`),
      },
      {
        id: "language",
        accessorKey: "language",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.knowledge.field.language")}
          />
        ),
        cell: ({ row }) => row.original.language ?? "-",
      },
      {
        id: "version",
        accessorKey: "version",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.knowledge.field.version")}
          />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.version ?? "-"}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.knowledge.field.status")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(
          t("ai.knowledge.field.status"),
          VERSION_STATUSES.map((status) => ({
            label: t(`ai.knowledge.status.${status.toLowerCase()}`),
            value: status,
          }))
        ),
        cell: ({ row }) =>
          row.original.status ? (
            <VersionStatusBadge status={row.original.status} />
          ) : (
            "-"
          ),
      },
      {
        id: "created_at",
        accessorKey: "created_at",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.knowledge.field.created_at")}
          />
        ),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {row.original.created_at ? formatDate(row.original.created_at) : "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("common.field.action")}</div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              title={t("common.action.detail")}
              aria-label={t("common.action.detail")}
              onClick={() => onOpen(row.original)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [formatDate, onOpen, t]
  )
}
