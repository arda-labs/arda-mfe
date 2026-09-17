import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import {
  matchSelectFilter,
  matchTextColumnFilter,
} from "@workspace/list-page/column-filters"
import {
  sortByColumn,
  useClientListTable,
} from "@workspace/list-page/client-list"
import { ListPageShell } from "@workspace/list-page/list-page-shell"
import { ListTableToolbar } from "@workspace/list-page/list-table-toolbar"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Sparkles } from "lucide-react"
import { knowledgeApi, type SourceOut, type VersionOut } from "./api"
import { CreateSourceDialog } from "./components/create-source-dialog"
import { CreateVersionDialog } from "./components/create-version-dialog"
import { RetrievalPlayground } from "./components/retrieval-playground"
import { SourceDetail } from "./components/source-detail"
import { useSourceColumns } from "./components/source-columns"

const DEFAULT_PAGE_SIZE = 10

/**
 * Knowledge corpus (`/ai/knowledge`). `knowledgeApi.listSources()` returns the
 * complete set (bare array), so this is a client tier list: filter/sort/paginate
 * in memory behind the shared DataTable + ListPageShell, URL-synced via
 * useClientListTable.
 */
export function KnowledgePage() {
  const { t, formatDate } = useI18n()
  const [sources, setSources] = useState<SourceOut[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [selected, setSelected] = useState<SourceOut | null>(null)
  const [versions, setVersions] = useState<VersionOut[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [createSourceOpen, setCreateSourceOpen] = useState(false)
  const [createVersionOpen, setCreateVersionOpen] = useState(false)
  const [playgroundOpen, setPlaygroundOpen] = useState(false)

  const loadSources = useCallback(async () => {
    setLoading(true)
    try {
      setSources(await knowledgeApi.listSources())
      setLoadError(null)
    } catch (err) {
      setLoadError(err)
      notify.error(
        t("ai.knowledge.load_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadSources()
  }, [loadSources])

  const loadVersions = useCallback(
    async (sourceId: number) => {
      setVersionsLoading(true)
      try {
        setVersions(await knowledgeApi.listVersions(sourceId))
      } catch (err) {
        setVersions([])
        notify.error(
          t("ai.knowledge.load_versions_failed"),
          err instanceof Error ? err.message : String(err)
        )
      } finally {
        setVersionsLoading(false)
      }
    },
    [t]
  )

  const openSource = useCallback(
    async (source: SourceOut) => {
      setSelected(source)
      setVersions([])
      await loadVersions(source.id)
    },
    [loadVersions]
  )

  const handleOpen = useCallback(
    (source: SourceOut) => {
      void openSource(source)
    },
    [openSource]
  )

  const columns = useSourceColumns({ onOpen: handleOpen })

  const { table, total } = useClientListTable<SourceOut>({
    columns,
    items: sources,
    filterBy: {
      title: (item, value) => matchTextColumnFilter(value, item.title),
      classification: (item, value) =>
        matchTextColumnFilter(value, item.classification),
      scope: (item, value) => matchSelectFilter(item.scope, value),
      status: (item, value) => matchSelectFilter(item.status ?? "", value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        title: (a, b) => a.title.localeCompare(b.title),
        classification: (a, b) =>
          (a.classification ?? "").localeCompare(b.classification ?? ""),
        scope: (a, b) => a.scope.localeCompare(b.scope),
        language: (a, b) => (a.language ?? "").localeCompare(b.language ?? ""),
        version: (a, b) => (a.version ?? "").localeCompare(b.version ?? ""),
        status: (a, b) => (a.status ?? "").localeCompare(b.status ?? ""),
        created_at: (a, b) =>
          (a.created_at ?? "").localeCompare(b.created_at ?? ""),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  const backToList = async () => {
    setSelected(null)
    setVersions([])
    await loadSources()
  }

  return (
    <>
      {selected ? (
        <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4 sm:p-5">
          <SourceDetail
            source={selected}
            versions={versions}
            loading={versionsLoading}
            formatDate={formatDate}
            onBack={() => void backToList()}
            onDeleted={() => void backToList()}
            onCreateVersion={() => setCreateVersionOpen(true)}
            onVersionsMutated={() => loadVersions(selected.id)}
          />
        </section>
      ) : (
        <ListPageShell
          title={t("ai.knowledge.title")}
          header={
            <p className="max-w-3xl text-sm text-muted-foreground">
              {t("ai.knowledge.description")}
            </p>
          }
          totalRows={total}
          meta={
            <Badge
              variant="secondary"
              className="px-2.5 py-0.5 text-[10px] font-bold"
            >
              {t("ai.knowledge.count", { count: total })}
            </Badge>
          }
          criticalPending={loading && sources.length === 0}
          criticalError={loadError}
          onRetry={() => void loadSources()}
          loadErrorTitle={t("ai.knowledge.load_failed")}
          fetching={loading && sources.length > 0}
          table={table}
          onRowDoubleClick={(row) => void openSource(row.original)}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setPlaygroundOpen(true)}
            >
              <Sparkles className="size-3.5 text-primary" />
              {t("ai.knowledge.playground.button")}
            </Button>
          }
          toolbar={
            <ListTableToolbar
              table={table}
              onCreate={() => setCreateSourceOpen(true)}
              createLabel={t("ai.knowledge.new_source")}
              exportFilename={t("ai.knowledge.title")}
              sheetName={t("ai.knowledge.title")}
              totalRowsCount={total}
            />
          }
        />
      )}

      <CreateSourceDialog
        open={createSourceOpen}
        onOpenChange={setCreateSourceOpen}
        onSuccess={loadSources}
      />
      {selected ? (
        <CreateVersionDialog
          open={createVersionOpen}
          onOpenChange={setCreateVersionOpen}
          sourceId={selected.id}
          onSuccess={() => loadVersions(selected.id)}
        />
      ) : null}

      <RetrievalPlayground
        open={playgroundOpen}
        onOpenChange={setPlaygroundOpen}
      />
    </>
  )
}
