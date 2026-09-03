import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { knowledgeApi, type SourceOut, type VersionOut } from "../api"
import { VersionActionsInner } from "./version-actions"

const STATUS_COLOR: Record<string, "default" | "secondary" | "success" | "destructive" | "warning" | "info"> = {
  DRAFT: "default",
  REVIEW: "warning",
  APPROVED: "info",
  INDEXING: "secondary",
  PUBLISHED: "success",
  REJECTED: "destructive",
}

function statusLabel(status: string | null): string {
  if (!status) return "-"
  return `platform.knowledge.status.${status.toLowerCase()}`
}

export function VersionStatusBadge({ status }: { status: string }) {
  const { t } = useI18n()
  return (
    <Badge variant={STATUS_COLOR[status] ?? "secondary"}>
      {t(statusLabel(status))}
    </Badge>
  )
}

export function SourceListTable({
  sources,
  onSelect,
  formatDate,
}: {
  sources: SourceOut[]
  onSelect: (source: SourceOut) => void
  formatDate: (value: string) => string
}) {
  const { t } = useI18n()
  return (
    <Card className="min-h-0 flex-1 overflow-hidden">
      <CardContent className="h-full overflow-y-auto p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("platform.knowledge.field.title")}</TableHead>
              <TableHead>{t("platform.knowledge.field.scope")}</TableHead>
              <TableHead>{t("platform.knowledge.field.language")}</TableHead>
              <TableHead>{t("platform.knowledge.field.version")}</TableHead>
              <TableHead>{t("platform.knowledge.field.status")}</TableHead>
              <TableHead>{t("platform.knowledge.field.created_at")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  {t("platform.knowledge.empty")}
                </TableCell>
              </TableRow>
            ) : (
              sources.map((source) => (
                <TableRow
                  key={source.id}
                  className="cursor-pointer"
                  onClick={() => onSelect(source)}
                >
                  <TableCell className="font-medium">{source.title}</TableCell>
                  <TableCell>{t(`platform.knowledge.scope.${source.scope}`)}</TableCell>
                  <TableCell>{source.language ?? "-"}</TableCell>
                  <TableCell>{source.version ?? "-"}</TableCell>
                  <TableCell>
                    {source.status ? (
                      <VersionStatusBadge status={source.status} />
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {source.created_at ? formatDate(source.created_at) : "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function SourceDetail({
  source,
  versions,
  loading,
  formatDate,
  onBack,
  onDeleted,
  onCreateVersion,
  onVersionsMutated,
}: {
  source: SourceOut
  versions: VersionOut[]
  loading: boolean
  formatDate: (value: string) => string
  onBack: () => void
  onDeleted: () => void
  onCreateVersion: () => void
  onVersionsMutated: () => Promise<void>
}) {
  const { t } = useI18n()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await knowledgeApi.deleteSource(source.id)
      notify.success(t("platform.knowledge.toast.delete_success"))
      setDeleteOpen(false)
      onDeleted()
    } catch (err) {
      notify.error(
        t("platform.knowledge.toast.delete_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1.5 size-3.5" />
          {t("common.action.back")}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 size-3.5" />
            {t("common.action.delete")}
          </Button>
          <Button size="sm" onClick={onCreateVersion}>
            <Plus className="mr-1.5 size-3.5" />
            {t("platform.knowledge.new_version")}
          </Button>
        </div>
      </div>

      <Card className="shrink-0">
        <CardContent className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{source.title}</h2>
            {source.status ? <VersionStatusBadge status={source.status} /> : null}
            {source.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {source.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {source.description ? (
            <p className="text-sm text-muted-foreground">{source.description}</p>
          ) : null}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">{t("platform.knowledge.field.scope")}</dt>
              <dd className="font-medium">{t(`platform.knowledge.scope.${source.scope}`)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("platform.knowledge.field.source_type")}</dt>
              <dd className="font-medium">{t(`platform.knowledge.source_type.${source.source_type}`)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("platform.knowledge.field.language")}</dt>
              <dd className="font-medium">{source.language ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("platform.knowledge.field.version")}</dt>
              <dd className="font-medium">{source.version ?? "-"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="min-h-0 flex-1 overflow-hidden">
        <CardContent className="h-full overflow-y-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("platform.knowledge.field.version")}</TableHead>
                <TableHead>{t("platform.knowledge.field.status")}</TableHead>
                <TableHead>{t("platform.knowledge.field.content_type")}</TableHead>
                <TableHead>{t("platform.knowledge.field.chunker")}</TableHead>
                <TableHead>{t("platform.knowledge.field.created_at")}</TableHead>
                <TableHead className="text-right">{t("common.field.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8">
                    <Skeleton className="mx-auto h-4 w-48" />
                  </TableCell>
                </TableRow>
              ) : versions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    {t("platform.knowledge.empty_versions")}
                  </TableCell>
                </TableRow>
              ) : (
                versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-mono text-xs">{version.version}</TableCell>
                    <TableCell><VersionStatusBadge status={version.status} /></TableCell>
                    <TableCell>{t(`platform.knowledge.content_type.${version.content_type}`)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {version.chunk_size != null
                        ? `${version.chunk_size}/${version.chunk_overlap ?? 0}`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {version.created_at ? formatDate(version.created_at) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <VersionActionsInner
                        version={version}
                        sourceId={source.id}
                        onMutate={onVersionsMutated}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("platform.knowledge.confirm_delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("platform.knowledge.confirm_delete", { title: source.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
