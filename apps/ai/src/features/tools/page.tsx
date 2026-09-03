import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { RefreshCw, Wrench } from "lucide-react"
import { toolsApi } from "./api"
import { InternalToolsTab } from "./components/internal-tools-tab"
import { MCPServerTab } from "./components/mcp-server-tab"
import { ToolDetailDialog } from "./components/tool-detail-dialog"
import type { CatalogTool } from "./types"

export function ToolsPage() {
  const { t } = useI18n()
  const [tools, setTools] = useState<CatalogTool[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTool, setSelectedTool] = useState<CatalogTool | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadTools = useCallback(async () => {
    setLoading(true)
    try {
      const data = await toolsApi.listTools()
      setTools(data)
    } catch {
      notify.error(t("ai.tools.load_failed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadTools()
  }, [loadTools])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={t("ai.tools.title")}
          description={t("ai.tools.description")}
          icon={Wrench}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
          onClick={loadTools}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("ai.tools.btn.refresh")}
        </Button>
      </div>

      <Tabs defaultValue="internal" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="internal" className="gap-2">
            {t("ai.tools.tab.internal")}
            {tools.length > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                {tools.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="mcp">{t("ai.tools.tab.mcp")}</TabsTrigger>
        </TabsList>

        <div className="mt-4 flex-1">
          <TabsContent value="internal" className="m-0 focus-visible:outline-none">
            <InternalToolsTab
              tools={tools}
              loading={loading}
              onSelect={(tool) => {
                setSelectedTool(tool)
                setDialogOpen(true)
              }}
            />
          </TabsContent>

          <TabsContent value="mcp" className="m-0 focus-visible:outline-none">
            <MCPServerTab />
          </TabsContent>
        </div>
      </Tabs>

      <ToolDetailDialog
        tool={selectedTool}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  )
}
