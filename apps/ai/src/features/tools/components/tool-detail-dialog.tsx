import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { ShieldAlert, ShieldCheck } from "lucide-react"
import type { CatalogTool } from "../types"

interface ToolDetailDialogProps {
  tool: CatalogTool | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ToolDetailDialog({
  tool,
  open,
  onOpenChange,
}: ToolDetailDialogProps) {
  const { t } = useI18n()

  if (!tool) return null

  const cleanDescription = tool.jsdoc
    .replace(/\/\*\*|\*\/|\*/g, "")
    .replace(/@param.*|@returns.*|@requires.*|@domain.*|@note.*/g, "")
    .replace(/\s+/g, " ")
    .trim()

  const overrideLabel =
    tool.overrideEnabled === null
      ? t("ai.tools.override.none")
      : tool.overrideEnabled
        ? t("ai.tools.override.enabled")
        : t("ai.tools.override.disabled")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="font-mono text-base font-semibold">
              {tool.sdkPath}
            </DialogTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant={tool.enabled ? "success" : "outline"}>
                {tool.enabled
                  ? t("ai.tools.status.enabled")
                  : t("ai.tools.status.disabled")}
              </Badge>
              <Badge variant={tool.kind === "confirm" ? "warning" : "secondary"}>
                {tool.kind === "confirm" ? (
                  <ShieldAlert className="mr-1 h-3 w-3" />
                ) : (
                  <ShieldCheck className="mr-1 h-3 w-3" />
                )}
                {t(`ai.tools.kind.${tool.kind}`)}
              </Badge>
              <Badge
                variant={
                  tool.risk === "high"
                    ? "destructive"
                    : tool.risk === "medium"
                      ? "warning"
                      : "outline"
                }
              >
                {t(`ai.tools.risk.${tool.risk}`)}
              </Badge>
            </div>
          </div>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {tool.domain.toUpperCase()} • Timeout: {tool.timeoutMs}ms
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-3 text-xs sm:grid-cols-3">
            <div>
              <span className="font-medium text-muted-foreground">
                {t("ai.tools.detail.contract_state")}
              </span>
              <p className="mt-0.5">
                {tool.contractEnabled
                  ? t("ai.tools.status.enabled")
                  : t("ai.tools.status.disabled")}
              </p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                {t("ai.tools.detail.override_state")}
              </span>
              <p className="mt-0.5">{overrideLabel}</p>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">
                {t("ai.tools.detail.source")}
              </span>
              <p className="mt-0.5 font-mono">{tool.source}</p>
            </div>
            {tool.updatedBy && (
              <div className="sm:col-span-3">
                <span className="font-medium text-muted-foreground">
                  {t("ai.tools.detail.updated")}
                </span>
                <p className="mt-0.5 font-mono text-[11px]">
                  {tool.updatedBy}
                  {tool.updatedAt ? ` • ${tool.updatedAt}` : ""}
                </p>
              </div>
            )}
          </div>

          {cleanDescription && (
            <div>
              <span className="text-xs font-medium text-muted-foreground">
                {t("ai.tools.field.description")}
              </span>
              <p className="mt-1 text-xs text-foreground/90">
                {cleanDescription}
              </p>
            </div>
          )}

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("ai.tools.field.signature")}
            </span>
            <pre className="mt-1 overflow-x-auto rounded-lg border bg-muted/70 p-3 font-mono text-xs">
              {tool.signature}
            </pre>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("ai.tools.field.jsdoc")}
            </span>
            <pre className="mt-1 max-h-48 overflow-y-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
              {tool.jsdoc}
            </pre>
          </div>

          <div>
            <span className="text-xs font-medium text-muted-foreground">
              {t("ai.tools.field.permissions")}
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {tool.requiredPermissions.length > 0 ? (
                tool.requiredPermissions.map((perm) => (
                  <span
                    key={perm}
                    className="rounded-md border bg-muted px-2 py-0.5 font-mono text-[11px]"
                  >
                    {perm}
                  </span>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t("ai.tools.no_permissions_required")}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            {t("ai.tools.btn.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
