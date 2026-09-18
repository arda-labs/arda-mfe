import { useCallback, useEffect, useMemo, useState } from "react"
import { FilePreviewDialog } from "@workspace/ui/components/file-preview"
import { useI18n } from "@workspace/i18n"
import { getMediaMetadata, type MediaFile } from "@workspace/media"
import { Badge } from "@workspace/ui/components/badge"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import {
  matchBooleanActiveFilter,
  matchTextColumnFilter,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { templatesApi } from "./api"
import { TemplateDeleteDialog } from "./components/template-delete-dialog"
import { TemplateFormDialog } from "./components/template-form-dialog"
import { buildTemplateColumns } from "./components/template-columns"
import { useTemplateFilePreview } from "./components/use-template-preview"
import type { FileTemplate } from "./types"
import { templatePublicId } from "./urls"

const DEFAULT_PAGE_SIZE = 10
/** media-service bounds the batch metadata lookup per request. */
const METADATA_CHUNK_SIZE = 100

export function TemplatesPage() {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FileTemplate | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = useState<FileTemplate | null>(null)
  const [fileMetaById, setFileMetaById] = useState<Map<string, MediaFile>>(
    new Map()
  )
  const [templates, setTemplates] = useState<FileTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<unknown>(null)

  const { openPreview, download, previewSource, closePreview } =
    useTemplateFilePreview()

  /** Media metadata (real name/size) is an enhancement: failures are ignored. */
  const loadFileMetadata = useCallback(async (items: FileTemplate[]) => {
    const ids = [
      ...new Set(items.map((item) => templatePublicId(item.file_url))),
    ].filter(Boolean)
    if (ids.length === 0) {
      setFileMetaById(new Map())
      return
    }
    const merged = new Map<string, MediaFile>()
    try {
      for (let index = 0; index < ids.length; index += METADATA_CHUNK_SIZE) {
        const chunk = ids.slice(index, index + METADATA_CHUNK_SIZE)
        for (const file of await getMediaMetadata(chunk)) {
          merged.set(file.public_id, file)
        }
      }
      setFileMetaById(merged)
    } catch {
      setFileMetaById(new Map())
    }
  }, [])

  const loadTemplates = useCallback(
    async (initial = false) => {
      if (initial) setLoading(true)
      else setRefreshing(true)
      setLoadError(null)
      try {
        const result = await templatesApi.listFileTemplates()
        setTemplates(result)
        void loadFileMetadata(result)
      } catch (reason) {
        setLoadError(reason)
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [loadFileMetadata]
  )

  useEffect(() => {
    void loadTemplates(true)
  }, [loadTemplates])

  const openCreate = useCallback(() => {
    setEditingTemplate(null)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((template: FileTemplate) => {
    setEditingTemplate(template)
    setDialogOpen(true)
  }, [])

  const columns = useMemo(
    () =>
      buildTemplateColumns(t, {
        onPreview: openPreview,
        onDownload: download,
        onEdit: openEdit,
        onDelete: setDeleteTarget,
        getFileMeta: (file) =>
          fileMetaById.get(templatePublicId(file.file_url)),
      }),
    [t, openPreview, download, openEdit, fileMetaById]
  )

  const { table, total } = useClientListTable({
    columns,
    items: templates,
    filterBy: {
      name: (item, value) =>
        matchTextColumnFilter(value, item.code, item.name, item.description),
      is_active: (item, value) => matchBooleanActiveFilter(item, value),
    },
    sort: (rows, sortState) =>
      sortByColumn(rows, sortState, {
        code: (a, b) => a.code.localeCompare(b.code),
        name: (a, b) => a.name.localeCompare(b.name),
        file_type: (a, b) => a.file_type.localeCompare(b.file_type),
        is_active: (a, b) => Number(a.is_active) - Number(b.is_active),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const dialogs = (
    <>
      <TemplateFormDialog
        open={dialogOpen}
        template={editingTemplate}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingTemplate(null)
        }}
        onSaved={() => loadTemplates()}
        onPreview={openPreview}
        onDownload={download}
      />

      <TemplateDeleteDialog
        template={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onDeleted={() => loadTemplates()}
      />

      <FilePreviewDialog
        open={previewSource !== null}
        onOpenChange={(open) => {
          if (!open) closePreview()
        }}
        source={previewSource}
      />
    </>
  )

  return (
    <ListPageShell
      title={t("platform.templates.title")}
      totalRows={total}
      meta={
        <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
          {t("platform.templates.count", { count: total })}
        </Badge>
      }
      criticalPending={loading}
      criticalError={loadError}
      onRetry={loadTemplates}
      loadErrorTitle={t("platform.templates.load_failed")}
      fetching={refreshing}
      table={table}
      toolbar={
        <ListTableToolbar
          table={table}
          onCreate={openCreate}
          createLabel={t("platform.templates.create")}
          exportFilename={t("platform.templates.title")}
        />
      }
      dialogs={dialogs}
    />
  )
}
