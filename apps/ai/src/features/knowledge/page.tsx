import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Database, FolderSync, Layers, Plus, Sparkles } from "lucide-react"
import { knowledgeApi, type SourceOut, type VersionOut } from "./api"
import { ChunkingStrategiesTab } from "./components/chunking-strategies-tab"
import { ConnectorsTab } from "./components/connectors-tab"
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
  const [activeTab, setActiveTab] = useState("corpus")

  const loadSources = useCallback(async () => {
    try {
      setSources(await knowledgeApi.listSources())
    } catch (err) {
      setSources([])
      notify.error(
        t("ai.knowledge.load_failed"),
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
          t("ai.knowledge.load_versions_failed"),
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
        <PageHeader title={t("ai.knowledge.title")} icon={Database} />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </section>
    )
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <PageHeader
              title={t("ai.knowledge.title")}
              icon={Database}
              description={t("ai.knowledge.description")}
            />
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlaygroundOpen(true)}
              >
                <Sparkles className="mr-1.5 size-3.5 text-primary" />
                {t("ai.knowledge.playground.button")}
              </Button>
              <Button size="sm" onClick={() => setCreateSourceOpen(true)}>
                <Plus className="mr-1.5 size-3.5" />
                {t("ai.knowledge.new_source")}
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 sm:w-[480px]">
              <TabsTrigger value="corpus" className="gap-1.5 text-xs">
                <Database className="h-3.5 w-3.5" />
                {t("ai.knowledge.tabs.corpus")}
              </TabsTrigger>
              <TabsTrigger value="connectors" className="gap-1.5 text-xs">
                <FolderSync className="h-3.5 w-3.5" />
                {t("ai.knowledge.tabs.connectors")}
              </TabsTrigger>
              <TabsTrigger value="strategies" className="gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5" />
                {t("ai.knowledge.tabs.strategies")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="corpus" className="m-0 space-y-4">
              <SourceListTable
                sources={sources}
                onSelect={(source) => void openSource(source)}
                formatDate={formatDate}
              />
            </TabsContent>

            <TabsContent value="connectors" className="m-0">
              <ConnectorsTab />
            </TabsContent>

            <TabsContent value="strategies" className="m-0">
              <ChunkingStrategiesTab />
            </TabsContent>
          </Tabs>
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
