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
import { Switch } from "@workspace/ui/components/switch"
import { Eye, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react"
import type { CatalogTool } from "../types"

export interface ToolDomainOption {
  value: string
  label: string
  count: number
}

export interface UseToolColumnsOptions {
  domainOptions: ToolDomainOption[]
  canManage: boolean
  canCall: (tool: CatalogTool) => boolean
  updating: string | null
  onInspect: (tool: CatalogTool) => void
  onToggle: (tool: CatalogTool, next: boolean) => void
  onRestore: (tool: CatalogTool) => void
}

function shortDescription(jsdoc: string) {
  return jsdoc
    .replace(/\/\*\*|\*\/|\*/g, "")
    .replace(/@param.*|@returns.*|@requires.*|@domain.*|@note.*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140)
}

/** Column defs for the AI tool catalog (`/ai/tools`) — client tier table. */
export function useToolColumns({
  domainOptions,
  canManage,
  canCall,
  updating,
  onInspect,
  onToggle,
  onRestore,
}: UseToolColumnsOptions): ColumnDef<CatalogTool>[] {
  const { t } = useI18n()

  return useMemo<ColumnDef<CatalogTool>[]>(
    () => [
      {
        id: "tool",
        accessorKey: "sdkPath",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.tools.column.tool")}
          />
        ),
        enableColumnFilter: true,
        meta: textSearchMeta(
          t("ai.tools.column.tool"),
          t("ai.tools.placeholder.search")
        ),
        cell: ({ row }) => {
          const description = shortDescription(row.original.jsdoc)
          return (
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-xs font-semibold">
                  {row.original.sdkPath}
                </span>
                {!canCall(row.original) && (
                  <Badge variant="outline" className="text-[10px]">
                    {t("ai.tools.no_permission")}
                  </Badge>
                )}
              </div>
              {description && (
                <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          )
        },
      },
      {
        id: "domain",
        accessorKey: "domain",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.tools.column.domain")}
          />
        ),
        enableColumnFilter: true,
        meta: {
          label: t("ai.tools.column.domain"),
          variant: "multiSelect",
          options: domainOptions,
        },
        cell: ({ row }) => (
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted-foreground">
            {row.original.domain}
          </span>
        ),
      },
      {
        id: "kind",
        accessorKey: "kind",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.tools.column.kind")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("ai.tools.column.kind"), [
          { label: t("ai.tools.kind.read"), value: "read" },
          { label: t("ai.tools.kind.confirm"), value: "confirm" },
        ]),
        cell: ({ row }) => (
          <Badge
            variant={row.original.kind === "confirm" ? "warning" : "secondary"}
            className="text-[10px]"
          >
            {row.original.kind === "confirm" ? (
              <ShieldAlert className="mr-0.5 h-2.5 w-2.5" />
            ) : (
              <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
            )}
            {t(`ai.tools.kind.${row.original.kind}`)}
          </Badge>
        ),
      },
      {
        id: "risk",
        accessorKey: "risk",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.tools.column.risk")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("ai.tools.column.risk"), [
          { label: t("ai.tools.risk.low"), value: "low" },
          { label: t("ai.tools.risk.medium"), value: "medium" },
          { label: t("ai.tools.risk.high"), value: "high" },
        ]),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.risk === "high"
                ? "destructive"
                : row.original.risk === "medium"
                  ? "warning"
                  : "outline"
            }
            className="text-[10px]"
          >
            {t(`ai.tools.risk.${row.original.risk}`)}
          </Badge>
        ),
      },
      {
        id: "permissions",
        accessorKey: "requiredPermissions",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.tools.column.permissions")}
          />
        ),
        cell: ({ row }) =>
          row.original.requiredPermissions.length === 0 ? (
            <span className="text-[11px] text-muted-foreground">
              {t("ai.tools.no_permissions_required")}
            </span>
          ) : (
            <span
              className="font-mono text-[10px] text-muted-foreground"
              title={row.original.requiredPermissions.join(", ")}
            >
              {row.original.requiredPermissions[0]}
              {row.original.requiredPermissions.length > 1
                ? ` +${row.original.requiredPermissions.length - 1}`
                : ""}
            </span>
          ),
      },
      {
        id: "enabled",
        accessorKey: "enabled",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            label={t("ai.tools.column.enabled")}
          />
        ),
        enableColumnFilter: true,
        meta: multiSelectFilterMeta(t("ai.tools.column.enabled"), [
          { label: t("ai.tools.status.enabled"), value: "true" },
          { label: t("ai.tools.status.disabled"), value: "false" },
        ]),
        cell: ({ row }) => {
          const tool = row.original
          const overridden = tool.overrideEnabled !== null
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={tool.enabled}
                  disabled={
                    !canManage ||
                    !tool.contractEnabled ||
                    updating === tool.methodName
                  }
                  onCheckedChange={(checked) => onToggle(tool, checked)}
                  aria-label={tool.sdkPath}
                />
                <span
                  className={
                    tool.enabled
                      ? "text-[11px] text-foreground"
                      : "text-[11px] text-muted-foreground"
                  }
                >
                  {tool.enabled
                    ? t("ai.tools.status.enabled")
                    : t("ai.tools.status.disabled")}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {!tool.contractEnabled ? (
                  <Badge variant="outline" className="text-[10px]">
                    {t("ai.tools.override.contract_disabled")}
                  </Badge>
                ) : overridden ? (
                  <Badge variant="warning" className="text-[10px]">
                    {t("ai.tools.override.active")}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground">
                    {t("ai.tools.override.contract")}
                  </span>
                )}
                {overridden && canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 gap-1 px-1.5 text-[10px]"
                    disabled={updating === tool.methodName}
                    onClick={() => onRestore(tool)}
                    title={t("ai.tools.btn.restore")}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t("ai.tools.btn.restore")}
                  </Button>
                )}
              </div>
            </div>
          )
        },
      },
      {
        id: "actions",
        header: () => (
          <div className="text-right">{t("ai.tools.column.actions")}</div>
        ),
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="text-right">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px]"
              onClick={() => onInspect(row.original)}
            >
              <Eye className="h-3 w-3" />
              {t("ai.tools.btn.inspect")}
            </Button>
          </div>
        ),
      },
    ],
    [
      canCall,
      canManage,
      domainOptions,
      onInspect,
      onRestore,
      onToggle,
      t,
      updating,
    ]
  )
}
