import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Switch } from "@workspace/ui/components/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Eye, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react"
import type { CatalogTool } from "../types"

interface ToolsTableProps {
  tools: CatalogTool[]
  loading: boolean
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  filteredCount: number
  canManage: boolean
  updating: string | null
  canCall: (tool: CatalogTool) => boolean
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

export function ToolsTable({
  tools,
  loading,
  page,
  pageCount,
  onPageChange,
  filteredCount,
  canManage,
  updating,
  canCall,
  onInspect,
  onToggle,
  onRestore,
}: ToolsTableProps) {
  const { t } = useI18n()

  if (loading && tools.length === 0) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  if (tools.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-xs text-muted-foreground">
        {filteredCount === 0 && page > 1
          ? t("ai.tools.no_tools_page")
          : t("ai.tools.no_tools_found")}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">
                {t("ai.tools.column.tool")}
              </TableHead>
              <TableHead className="w-24 text-xs">
                {t("ai.tools.column.domain")}
              </TableHead>
              <TableHead className="w-28 text-xs">
                {t("ai.tools.column.kind")}
              </TableHead>
              <TableHead className="w-28 text-xs">
                {t("ai.tools.column.risk")}
              </TableHead>
              <TableHead className="w-40 text-xs">
                {t("ai.tools.column.permissions")}
              </TableHead>
              <TableHead className="w-44 text-xs">
                {t("ai.tools.column.enabled")}
              </TableHead>
              <TableHead className="w-20 text-right text-xs">
                {t("ai.tools.column.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tools.map((tool) => {
              const description = shortDescription(tool.jsdoc)
              const overridden = tool.overrideEnabled !== null
              const callable = canCall(tool)
              return (
                <TableRow key={tool.methodName}>
                  <TableCell className="align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-semibold">
                        {tool.sdkPath}
                      </span>
                      {!callable && (
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
                  </TableCell>
                  <TableCell className="align-top">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                      {tool.domain}
                    </span>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge
                      variant={tool.kind === "confirm" ? "warning" : "secondary"}
                      className="text-[10px]"
                    >
                      {tool.kind === "confirm" ? (
                        <ShieldAlert className="mr-0.5 h-2.5 w-2.5" />
                      ) : (
                        <ShieldCheck className="mr-0.5 h-2.5 w-2.5" />
                      )}
                      {t(`ai.tools.kind.${tool.kind}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge
                      variant={
                        tool.risk === "high"
                          ? "destructive"
                          : tool.risk === "medium"
                            ? "warning"
                            : "outline"
                      }
                      className="text-[10px]"
                    >
                      {t(`ai.tools.risk.${tool.risk}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    {tool.requiredPermissions.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground">
                        {t("ai.tools.no_permissions_required")}
                      </span>
                    ) : (
                      <span
                        className="font-mono text-[10px] text-muted-foreground"
                        title={tool.requiredPermissions.join(", ")}
                      >
                        {tool.requiredPermissions[0]}
                        {tool.requiredPermissions.length > 1
                          ? ` +${tool.requiredPermissions.length - 1}`
                          : ""}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={tool.enabled}
                          disabled={
                            !canManage ||
                            !tool.contractEnabled ||
                            updating === tool.methodName
                          }
                          onCheckedChange={(checked) =>
                            onToggle(tool, checked)
                          }
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
                  </TableCell>
                  <TableCell className="text-right align-top">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[11px]"
                      onClick={() => onInspect(tool)}
                    >
                      <Eye className="h-3 w-3" />
                      {t("ai.tools.btn.inspect")}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {t("ai.tools.pagination.summary", {
              page,
              total: pageCount,
              count: filteredCount,
            })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              {t("ai.tools.pagination.prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px]"
              disabled={page >= pageCount}
              onClick={() => onPageChange(page + 1)}
            >
              {t("ai.tools.pagination.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
