import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Database, Plus, Sparkles } from "lucide-react"
import { knowledgeApi, type SourceOut, type VersionOut } from "./api"
import { CreateSourceDialog } from "./components/create-source-dialog"
import { CreateVersionDialog } from "./components/create-version-dialog"
import { RetrievalPlayground } from "./components/retrieval-playground"
import { SourceDetail, SourceListTable } from "./components/source-detail"

export function KnowledgePage() {
  const { t, formatDate } = useI18n()
  const [sources, setSources] = useState<SourceOut[] | null>(null)
  const [selected, setSelected] = useState<SourceOut | null>(null)
  const [versions, setVersions] = useState<VersionOut[]>([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [createSourceOpen, setCreateSourceOpen] = useState(false)
  const [createVersionOpen, setCreateVersionOpen] = useState(false)
  const [playgroundOpen, setPlaygroundOpen] = useState(false)


  const loadSources = useCallback(async () => {
    try {
      setSources(await knowledgeApi.listSources())
    } catch (err) {
      setSources([])
      notify.error(
        t("platform.knowledge.load_failed"),
        err instanceof Error ? err.message : String(err)
      )
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
          t("platform.knowledge.load_versions_failed"),
          err instanceof Error ? err.message : String(err)
        )
      } finally {
        setVersionsLoading(false)
      }
    },
    [t]
  )

  const openSource = async (source: SourceOut) => {
    setSelected(source)
    setVersions([])
    await loadVersions(source.id)
  }

  const backToList = async () => {
    setSelected(null)
    setVersions([])
    await loadSources()
  }

  if (!sources) {
    return (
      <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
        <PageHeader title={t("platform.knowledge.title")} icon={Database} />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-hidden p-4">
      {selected ? (
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
      ) : (
        <>
          <PageHeader
            title={t("platform.knowledge.title")}
            icon={Database}
            description={t("platform.knowledge.description")}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPlaygroundOpen(true)}
                >
                  <Sparkles className="mr-1.5 size-3.5 text-primary" />
                  {t("platform.knowledge.playground.button")}
                </Button>
                <Button size="sm" onClick={() => setCreateSourceOpen(true)}>
                  <Plus className="mr-1.5 size-3.5" />
                  {t("platform.knowledge.new_source")}
                </Button>
              </div>
            }
          />
          <SourceListTable
            sources={sources}
            onSelect={(source) => void openSource(source)}
            formatDate={formatDate}
          />
        </>
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
    </section>
  )
}
