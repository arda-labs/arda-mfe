import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Globe, Plus, Server, CheckCircle2, AlertCircle } from "lucide-react"
import type { MCPServer } from "../types"

const DEFAULT_MCP_SERVERS: MCPServer[] = [
  {
    id: "postgres-mcp",
    name: "PostgreSQL Database MCP",
    endpoint: "http://postgres-mcp.platform.svc:8080/sse",
    protocol: "sse",
    status: "connected",
    toolsCount: 8,
    description: "Cho phép Agent thực thi câu lệnh SQL có kiểm soát và tra cứu schema CSDL.",
  },
  {
    id: "garage-s3-mcp",
    name: "Garage S3 Storage MCP",
    endpoint: "http://garage.platform.svc:3900/mcp",
    protocol: "http",
    status: "connected",
    toolsCount: 4,
    description: "Tích hợp lưu trữ tệp, tạo presigned URL và đọc siêu dữ liệu tài liệu.",
  },
  {
    id: "zeebe-bpm-mcp",
    name: "Zeebe Workflow Orchestrator MCP",
    endpoint: "http://zeebe.platform.svc:26500/mcp",
    protocol: "sse",
    status: "connected",
    toolsCount: 6,
    description: "Khởi động và theo dõi các tiến trình nghiệp vụ Camunda Zeebe qua Agent.",
  },
]

export function MCPServerTab() {
  const { t } = useI18n()
  const [servers, setServers] = useState<MCPServer[]>(DEFAULT_MCP_SERVERS)
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [description, setDescription] = useState("")

  const handleAdd = () => {
    if (!name || !endpoint) return
    const newServer: MCPServer = {
      id: `mcp-${Date.now()}`,
      name,
      endpoint,
      protocol: endpoint.startsWith("http") ? "sse" : "stdio",
      status: "connected",
      toolsCount: 0,
      description,
    }
    setServers((prev) => [...prev, newServer])
    setName("")
    setEndpoint("")
    setDescription("")
    setAddOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            {t("ai.tools.mcp.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("ai.tools.mcp.description")}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {t("ai.tools.mcp.btn.add")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((s) => (
          <Card key={s.id} className="relative overflow-hidden transition-all hover:border-primary/40 hover:shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md border bg-muted p-1.5">
                    <Server className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-sm font-medium">{s.name}</CardTitle>
                </div>
                <Badge
                  variant={s.status === "connected" ? "default" : "destructive"}
                  className="gap-1 text-[10px]"
                >
                  {s.status === "connected" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <AlertCircle className="h-3 w-3" />
                  )}
                  {t(`ai.tools.mcp.status.${s.status}`)}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2 pt-1 text-xs">
                {s.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-0 text-xs">
              <div className="flex items-center justify-between border-t pt-2 text-muted-foreground">
                <span>{t("ai.tools.mcp.field.protocol")}:</span>
                <span className="font-mono font-medium uppercase text-foreground">
                  {s.protocol}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("ai.tools.mcp.field.endpoint")}:</span>
                <span className="max-w-[180px] truncate font-mono text-[11px] text-foreground">
                  {s.endpoint}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{t("ai.tools.mcp.field.tools_count")}:</span>
                <span className="font-semibold text-primary">
                  {s.toolsCount} tools
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {t("ai.tools.mcp.dialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("ai.tools.mcp.dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-medium">{t("ai.tools.mcp.field.name")}</label>
              <Input
                className="mt-1"
                placeholder="VD: Elasticsearch MCP"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium">{t("ai.tools.mcp.field.endpoint")}</label>
              <Input
                className="mt-1 font-mono text-xs"
                placeholder="http://my-service:8080/sse"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium">{t("ai.tools.mcp.field.description")}</label>
              <Input
                className="mt-1"
                placeholder="Mô tả chức năng máy chủ MCP..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              {t("ai.tools.btn.close")}
            </Button>
            <Button onClick={handleAdd} disabled={!name || !endpoint}>
              {t("ai.tools.mcp.btn.connect")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
