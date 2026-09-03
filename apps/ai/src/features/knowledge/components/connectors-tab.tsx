import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import {
  CheckCircle2,
  Clock,
  Database,
  FileText,
  FolderSync,
  HardDrive,
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

export function ConnectorsTab() {
  const { t, formatDate } = useI18n()
  const [connectors, setConnectors] = useState<DataConnector[]>(DEFAULT_CONNECTORS)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState("")
  const [provider, setProvider] = useState<DataConnector["provider"]>("google_drive")
  const [targetSource, setTargetSource] = useState("")
  const [schedule, setSchedule] = useState("Hourly")

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
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            {t("ai.knowledge.connectors.title")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("ai.knowledge.connectors.description")}
          </p>
        </div>
        <Button size="sm" className="gap-1.5 self-start sm:self-auto" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          {t("ai.knowledge.connectors.btn.add")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {connectors.map((c) => {
          const Icon = getProviderIcon(c.provider)
          const isSyncing = syncingId === c.id

          return (
            <Card key={c.id} className="transition-all hover:border-primary/40 hover:shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg border bg-muted p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">{c.name}</CardTitle>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-medium text-foreground">{c.targetSource}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {c.syncSchedule}
                  </Badge>
                </div>
                <CardDescription className="pt-2 text-xs">
                  {c.docCount} documents • {c.totalChunks} chunks indexed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div className="flex items-center justify-between border-t pt-2.5 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t("ai.knowledge.connectors.last_sync")}:
                  </span>
                  <span className="font-mono text-[11px] font-medium text-foreground">
                    {formatDate(c.lastSyncAt, { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 border-t pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 px-2.5 text-xs"
                    onClick={() => handleSyncNow(c.id)}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? t("ai.knowledge.connectors.syncing") : t("ai.knowledge.connectors.sync_now")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

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
                  <SelectItem value="sharepoint">Microsoft SharePoint / OneDrive</SelectItem>
                  <SelectItem value="s3_bucket">Garage / AWS S3 Object Storage</SelectItem>
                  <SelectItem value="postgres">PostgreSQL Database Mirror</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="font-medium">{t("ai.knowledge.connectors.field.target_source")}</label>
              <Input
                className="mt-1 h-8 text-xs"
                placeholder="Tên nguồn tri thức đích để lưu chunks..."
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
                  <SelectItem value="Real-time Webhook">Real-time Webhook (Tức thời)</SelectItem>
                  <SelectItem value="Hourly">Hourly (Hàng giờ)</SelectItem>
                  <SelectItem value="Daily at 02:00 AM">Daily at 02:00 AM (Hàng ngày)</SelectItem>
                  <SelectItem value="Weekly on Sunday">Weekly on Sunday (Cuối tuần)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              {t("ai.knowledge.connectors.btn.cancel")}
            </Button>
            <Button onClick={handleAddConnector} disabled={!name || !targetSource}>
              {t("ai.knowledge.connectors.btn.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
