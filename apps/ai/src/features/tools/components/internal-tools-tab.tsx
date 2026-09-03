import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Eye, Search, ShieldAlert, ShieldCheck } from "lucide-react"
import type { CatalogTool } from "../types"

interface InternalToolsTabProps {
  tools: CatalogTool[]
  loading: boolean
  onSelect: (tool: CatalogTool) => void
}

const DOMAINS = ["all", "crm", "finance", "hrm", "iam", "knowledge"]

export function InternalToolsTab({
  tools,
  loading,
  onSelect,
}: InternalToolsTabProps) {
  const { t } = useI18n()
  const [activeDomain, setActiveDomain] = useState("all")
  const [search, setSearch] = useState("")

  const filtered = tools.filter((tItem) => {
    if (activeDomain !== "all" && tItem.domain.toLowerCase() !== activeDomain) {
      return false
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        tItem.sdkPath.toLowerCase().includes(q) ||
        tItem.methodName.toLowerCase().includes(q) ||
        tItem.jsdoc.toLowerCase().includes(q)
      )
    }
    return true
  })

  if (loading && tools.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {DOMAINS.map((dom) => (
            <Button
              key={dom}
              variant={activeDomain === dom ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs capitalize"
              onClick={() => setActiveDomain(dom)}
            >
              {dom === "all" ? t("ai.tools.domain.all") : dom.toUpperCase()}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            placeholder={t("ai.tools.placeholder.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-xs text-muted-foreground">
          {t("ai.tools.no_tools_found")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tool) => {
            const shortDesc = tool.jsdoc
              .replace(/\/\*\*|\*\/|\*/g, "")
              .replace(/@param.*|@returns.*|@requires.*|@domain.*/g, "")
              .trim()
              .slice(0, 100)

            return (
              <div
                key={tool.sdkPath}
                className="flex flex-col justify-between rounded-xl border bg-card p-3.5 transition-all hover:border-primary/40 hover:shadow-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-muted-foreground">
                      {tool.domain}
                    </span>
                    <div className="flex items-center gap-1">
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
                    </div>
                  </div>

                  <div>
                    <h4 className="font-mono text-xs font-semibold tracking-tight text-foreground">
                      {tool.sdkPath}
                    </h4>
                    {shortDesc && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {shortDesc}...
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-2 text-[10px] text-muted-foreground">
                  <span>Timeout: {tool.timeoutMs}ms</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[11px]"
                    onClick={() => onSelect(tool)}
                  >
                    <Eye className="h-3 w-3" />
                    {t("ai.tools.btn.inspect")}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
