import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
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
} from "lucide-react"

export interface DataConnector {
  id: string
  name: string
  provider: "google_drive" | "sharepoint" | "confluence" | "s3_bucket" | "postgres"
  targetSource: string
  syncSchedule: string
  status: "synced" | "syncing" | "error" | "paused"
  lastSyncAt: string
  docCount: number
  totalChunks: number
}

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

interface ProviderMeta {
  icon: React.ComponentType<{ className?: string }>
  label: string
  gradient: string
  badgeClass: string
  iconClass: string
}

const PROVIDER_METAS: Record<DataConnector["provider"], ProviderMeta> = {
  google_drive: {
    icon: HardDrive,
    label: "Google Workspace",
    gradient: "from-emerald-500/15 via-teal-500/5 to-transparent",
    badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
    iconClass: "text-emerald-500",
  },
  confluence: {
    icon: FileText,
    label: "Atlassian Confluence",
    gradient: "from-blue-500/15 via-indigo-500/5 to-transparent",
    badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-600",
    iconClass: "text-blue-500",
  },
  s3_bucket: {
    icon: Database,
    label: "Garage S3 / MinIO",
    gradient: "from-amber-500/15 via-orange-500/5 to-transparent",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    iconClass: "text-amber-500",
  },
  sharepoint: {
    icon: Share2,
    label: "Microsoft SharePoint",
    gradient: "from-cyan-500/15 via-teal-500/5 to-transparent",
    badgeClass: "border-cyan-500/30 bg-cyan-500/10 text-cyan-600",
    iconClass: "text-cyan-500",
  },
  postgres: {
    icon: Database,
    label: "PostgreSQL DB Mirror",
    gradient: "from-violet-500/15 via-purple-500/5 to-transparent",
    badgeClass: "border-violet-500/30 bg-violet-500/10 text-violet-600",
    iconClass: "text-violet-500",
  },
}

export function ConnectorsTab() {
  const { t, formatDate } = useI18n()
  const [connectors, setConnectors] = useState<DataConnector[]>(DEFAULT_CONNECTORS)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [provider, setProvider] = useState<DataConnector["provider"]>("google_drive")
  const [targetSource, setTargetSource] = useState("")
  const [schedule, setSchedule] = useState("Hourly")

  const totalDocs = connectors.reduce((acc, c) => acc + c.docCount, 0)
  const totalChunks = connectors.reduce((acc, c) => acc + c.totalChunks, 0)

  const handleSyncNow = (id: string) => {
    setSyncingId(id)
    setTimeout(() => {
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, lastSyncAt: new Date().toISOString(), status: "synced" }
            : c
        )
      )
      setSyncingId(null)
      notify.success(t("ai.knowledge.connectors.sync_success"))
    }, 1500)
  }

  const handleAddConnector = () => {
    if (!name || !targetSource) return
    const newConn: DataConnector = {
      id: `conn-${Date.now()}`,
      name,
      provider,
      targetSource,
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
  }

  return (
    <div className="space-y-6">
      {/* Header & Add Button */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            {t("ai.knowledge.connectors.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("ai.knowledge.connectors.description")}
          </p>
        </div>
        <Button size="sm" className="gap-1.5 self-start sm:self-auto shadow-xs" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("ai.knowledge.connectors.btn.add")}
        </Button>
      </div>

      {/* Top Overview KPI Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <FolderSync className="h-3.5 w-3.5 text-primary" />
            <span>Pipelines Kết nối</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-foreground">{connectors.length}</span>
            <span className="text-[10px] text-emerald-600 font-medium">Auto-Sync</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <FileCheck2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Tài liệu Đã Nạp (Ingested)</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-foreground">{totalDocs}</span>
            <span className="text-[10px] text-muted-foreground">files đồng bộ</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Layers className="h-3.5 w-3.5 text-indigo-500" />
            <span>Vector Chunks Tạo ra</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-foreground">{totalChunks.toLocaleString()}</span>
            <span className="text-[10px] text-primary font-medium">HNSW Index</span>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-gradient-to-br from-card to-muted/30 p-3 shadow-2xs">
          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
            <Clock className="h-3.5 w-3.5 text-cyan-500" />
            <span>Chu kỳ Đồng bộ Kế tiếp</span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xs font-bold text-foreground">Trong 15 phút</span>
            <span className="text-[10px] text-muted-foreground">Webhook Ready</span>
          </div>
        </div>
      </div>

      {/* Connectors Cards Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {connectors.map((c) => {
          const meta = PROVIDER_METAS[c.provider] || PROVIDER_METAS.google_drive
          const Icon = meta.icon
          const isSyncing = syncingId === c.id

          return (
            <div
              key={c.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-4 backdrop-blur-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              {/* Top ambient gradient */}
              <div
                className={`pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${meta.gradient} opacity-60`}
              />

              <div className="relative space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/80 shadow-2xs">
                      <Icon className={`h-5 w-5 ${meta.iconClass}`} />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                        {c.name}
                      </h4>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{c.targetSource}</span>
                      </div>
                    </div>
                  </div>

                  <Badge variant="outline" className={`text-[10px] font-mono ${meta.badgeClass}`}>
                    {c.syncSchedule}
                  </Badge>
                </div>

                {/* Telemetry pill */}
                <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 p-2.5 text-xs">
                  <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                    <span>
                      <strong className="text-foreground">{c.docCount}</strong> docs
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-primary font-bold">{c.totalChunks}</strong> chunks
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">Tự động xử lý</span>
                </div>
              </div>

              <div className="relative mt-4 space-y-2 border-t border-border/60 pt-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t("ai.knowledge.connectors.last_sync")}:
                  </span>
                  <span className="font-mono text-[11px] font-medium text-foreground">
                    {formatDate(c.lastSyncAt, { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-3 text-xs group-hover:border-primary/50 group-hover:bg-primary/5 transition-all"
                    onClick={() => handleSyncNow(c.id)}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin text-primary" : ""}`} />
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
              <FolderSync className="h-4 w-4 text-primary" />
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
              {t("common.cancel")}
            </Button>
            <Button onClick={handleAddConnector} disabled={!name.trim() || !targetSource.trim()}>
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
