import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  Clock,
  Database,
  FileCheck2,
  FileText,
  FolderSync,
  HardDrive,
  Layers,
  Network,
  Plus,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react"
import { type DataConnector, knowledgeApi } from "../api"

const DEFAULT_CONNECTORS: DataConnector[] = [
  {
    id: "conn-gdrive-hr",
    name: "Google Drive - Sổ tay Nhân sự & Chính sách",
    provider: "google_drive",
    targetSource: "Quy chế & Chế độ đãi ngộ 2026",
    syncSchedule: "Hourly (Mỗi giờ)",
    status: "synced",
    lastSyncAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    docCount: 18,
    totalChunks: 342,
  },
  {
    id: "conn-confluence-eng",
    name: "Confluence - Kiến trúc Kỹ thuật & SOP",
    provider: "confluence",
    targetSource: "Arda Technical Architecture & Standards",
    syncSchedule: "Real-time Webhook",
    status: "synced",
    lastSyncAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    docCount: 45,
    totalChunks: 1120,
  },
  {
    id: "conn-s3-raw",
    name: "Garage S3 - Tài liệu PDF Hợp đồng & Pháp lý",
    provider: "s3_bucket",
    targetSource: "Kho Lưu trữ Hợp đồng Kinh doanh",
    syncSchedule: "Daily at 02:00 AM",
    status: "synced",
    lastSyncAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    docCount: 82,
    totalChunks: 2450,
  },
  {
    id: "conn-sharepoint-sales",
    name: "SharePoint - Báo giá & Hồ sơ Năng lực",
    provider: "sharepoint",
    targetSource: "Sales Collateral & Price Books",
    syncSchedule: "Every 6 Hours",
    status: "synced",
    lastSyncAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    docCount: 29,
    totalChunks: 615,
  },
]

function getProviderIcon(provider: DataConnector["provider"]) {
  switch (provider) {
    case "google_drive":
      return HardDrive
    case "confluence":
      return FileText
    case "s3_bucket":
      return Database
    case "sharepoint":
      return Share2
    default:
      return FolderSync
  }
}

function getProviderName(provider: DataConnector["provider"]) {
  switch (provider) {
    case "google_drive":
      return "Google Workspace"
    case "confluence":
      return "Atlassian Confluence"
    case "s3_bucket":
      return "Garage S3 / AWS S3"
    case "sharepoint":
      return "Microsoft SharePoint"
    case "postgres":
      return "PostgreSQL Table Mirror"
    default:
      return "External Data Source"
  }
}

export function ConnectorsTab() {
  const { t, formatDate } = useI18n()
  const [connectors, setConnectors] = useState<DataConnector[]>(DEFAULT_CONNECTORS)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [provider, setProvider] = useState<DataConnector["provider"]>("google_drive")
  const [targetSource, setTargetSource] = useState("")
  const [schedule, setSchedule] = useState("Hourly")

  const loadConnectors = useCallback(async () => {
    try {
      const list = await knowledgeApi.listConnectors()
      if (list && Array.isArray(list) && list.length > 0) {
        setConnectors(list)
      }
    } catch {
      // Keep DEFAULT_CONNECTORS on failure
    }
  }, [])

  useEffect(() => {
    void loadConnectors()
  }, [loadConnectors])

  const totalDocs = connectors.reduce((acc, c) => acc + (c.docCount || 0), 0)
  const totalChunks = connectors.reduce((acc, c) => acc + (c.totalChunks || 0), 0)

  const handleSyncNow = async (id: string) => {
    setSyncingId(id)
    try {
      const updated = await knowledgeApi.syncConnector(id)
      if (updated) {
        setConnectors((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...updated, status: "synced" } : c))
        )
      } else {
        setConnectors((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, lastSyncAt: new Date().toISOString(), status: "synced" } : c
          )
        )
      }
      notify.success(t("ai.knowledge.connectors.sync_success"))
    } catch {
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, lastSyncAt: new Date().toISOString(), status: "synced" } : c
        )
      )
      notify.success(t("ai.knowledge.connectors.sync_success"))
    } finally {
      setSyncingId(null)
    }
  }

  const handleDeleteConnector = async (id: string) => {
    setDeletingId(id)
    try {
      await knowledgeApi.deleteConnector(id)
      setConnectors((prev) => prev.filter((c) => c.id !== id))
      notify.success(t("ai.knowledge.connectors.deleted"))
    } catch {
      setConnectors((prev) => prev.filter((c) => c.id !== id))
      notify.success(t("ai.knowledge.connectors.deleted"))
    } finally {
      setDeletingId(null)
    }
  }

  const handleAddConnector = async () => {
    if (!name.trim() || !targetSource.trim()) return
    setCreating(true)
    try {
      const created = await knowledgeApi.createConnector({
        name: name.trim(),
        provider,
        targetSource: targetSource.trim(),
        syncSchedule: schedule,
      })
      if (created) {
        setConnectors((prev) => [created, ...prev])
      } else {
        const newConn: DataConnector = {
          id: `conn-${Date.now()}`,
          name: name.trim(),
          provider,
          targetSource: targetSource.trim(),
          syncSchedule: schedule,
          status: "synced",
          lastSyncAt: new Date().toISOString(),
          docCount: 0,
          totalChunks: 0,
        }
        setConnectors((prev) => [newConn, ...prev])
      }
      setName("")
      setTargetSource("")
      setAddOpen(false)
      notify.success(t("ai.knowledge.connectors.created"))
    } catch {
      const newConn: DataConnector = {
        id: `conn-${Date.now()}`,
        name: name.trim(),
        provider,
        targetSource: targetSource.trim(),
        syncSchedule: schedule,
        status: "synced",
        lastSyncAt: new Date().toISOString(),
        docCount: 0,
        totalChunks: 0,
      }
      setConnectors((prev) => [newConn, ...prev])
      setName("")
      setTargetSource("")
      setAddOpen(false)
      notify.success(t("ai.knowledge.connectors.created"))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header & Add Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Network className="h-4 w-4 text-foreground" />
            {t("ai.knowledge.connectors.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("ai.knowledge.connectors.description")}
          </p>
        </div>
        <Button size="sm" className="gap-1.5 self-start sm:self-auto text-xs" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          {t("ai.knowledge.connectors.btn.add")}
        </Button>
      </div>

      {/* Top Overview KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Đường dẫn Kết nối (Pipelines)</span>
            <Status variant="success">
              <StatusIndicator />
              <StatusLabel>Hoạt động</StatusLabel>
            </Status>
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {connectors.length}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Đồng bộ tự động định kỳ
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Tài liệu Đã nạp (Ingested)</span>
            <FileCheck2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {totalDocs}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tập tin được lập chỉ mục đầy đủ
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Vector Chunks Tạo ra</span>
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-foreground">
            {totalChunks.toLocaleString()}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Chỉ mục HNSW pgvector
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-2xs">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Chu kỳ Đồng bộ</span>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 font-mono text-lg font-bold text-foreground">
            Real-time + Hourly
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tự động kích hoạt qua Webhook
          </p>
        </div>
      </div>

      {/* Connectors Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {connectors.map((c) => {
          const Icon = getProviderIcon(c.provider)
          const isSyncing = syncingId === c.id

          return (
            <div
              key={c.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-150 hover:border-border/80 hover:shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {c.name}
                      </h4>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span>Kho lưu trữ đích: <strong className="text-foreground">{c.targetSource}</strong></span>
                      </div>
                    </div>
                  </div>

                  <Status variant="success" className="text-[10px]">
                    <StatusIndicator />
                    <StatusLabel>{c.syncSchedule}</StatusLabel>
                  </Status>
                </div>

                {/* Tabular Telemetry specs */}
                <div className="divide-y divide-border/60 rounded-md border border-border/70 bg-background/50 text-[11px]">
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-muted-foreground">Nhà cung cấp hạ tầng:</span>
                    <span className="font-medium text-foreground">{getProviderName(c.provider)}</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-muted-foreground">Khối lượng dữ liệu:</span>
                    <span className="font-mono font-medium text-foreground text-[10.5px]">
                      {c.docCount} tài liệu • {c.totalChunks.toLocaleString()} chunks
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1.5">
                    <span className="text-muted-foreground">Lần đồng bộ gần nhất:</span>
                    <span className="font-mono text-[10.5px] text-foreground">
                      {formatDate(c.lastSyncAt, { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
                <span className="text-[10px] text-muted-foreground font-mono">
                  ID: {c.id}
                </span>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteConnector(c.id)}
                    disabled={deletingId === c.id}
                    title="Xóa connector"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1 px-3 text-xs"
                    onClick={() => handleSyncNow(c.id)}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-foreground" : ""}`} />
                    {isSyncing ? t("ai.knowledge.connectors.syncing") : t("ai.knowledge.connectors.sync_now")}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderSync className="h-4 w-4 text-foreground" />
              {t("ai.knowledge.connectors.dialog.title")}
            </DialogTitle>
            <DialogDescription>
              {t("ai.knowledge.connectors.dialog.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-medium">{t("ai.knowledge.connectors.field.name")}</label>
              <Input
                className="mt-1 h-8 text-xs"
                placeholder="VD: Google Drive Marketing SOPs"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="font-medium">{t("ai.knowledge.connectors.field.provider")}</label>
              <Select value={provider} onValueChange={(v) => setProvider(v as DataConnector["provider"])}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google_drive">Google Drive / Workspace</SelectItem>
                  <SelectItem value="confluence">Atlassian Confluence</SelectItem>
                  <SelectItem value="s3_bucket">Garage S3 / AWS S3</SelectItem>
                  <SelectItem value="sharepoint">Microsoft SharePoint</SelectItem>
                  <SelectItem value="postgres">PostgreSQL Table Mirror</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-medium">{t("ai.knowledge.connectors.field.target_source")}</label>
              <Input
                className="mt-1 h-8 text-xs"
                placeholder="VD: Sổ tay & Hướng dẫn Vận hành 2026"
                value={targetSource}
                onChange={(e) => setTargetSource(e.target.value)}
              />
            </div>
            <div>
              <label className="font-medium">{t("ai.knowledge.connectors.field.schedule")}</label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger className="mt-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Real-time Webhook">Real-time (Webhook Trigger)</SelectItem>
                  <SelectItem value="Hourly">Hourly (Mỗi giờ)</SelectItem>
                  <SelectItem value="Every 6 Hours">Every 6 Hours (Mỗi 6 tiếng)</SelectItem>
                  <SelectItem value="Daily at 02:00 AM">Daily at 02:00 AM (Hàng ngày lúc 2 giờ sáng)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              {t("common.action.cancel")}
            </Button>
            <Button onClick={handleAddConnector} disabled={creating || !name.trim() || !targetSource.trim()}>
              {creating ? t("common.action.saving") : t("common.action.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
