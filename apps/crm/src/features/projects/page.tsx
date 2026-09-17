import { useCallback, useEffect, useMemo, useState } from "react"
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
import {
  addCrmProjectMember,
  getCrmProject,
  listCrmProjects,
  removeCrmProjectMember,
  type CrmProject,
  type CrmProjectMember,
} from "../api"
import { ProjectDialog } from "./components/ProjectDialog"
import { ProjectMembersDialog } from "./components/ProjectMembersDialog"
import {
  projectStatusLabel,
  useProjectColumns,
  type ProjectColumnOption,
} from "./components/project-columns"

const DEFAULT_PAGE_SIZE = 10

/**
 * CRM projects: catalog + members (W7). `listCrmProjects()` returns the complete
 * set, so this is a client tier list: filter/sort/paginate in memory behind the
 * shared DataTable + ListPageShell, URL-synced via useClientListTable.
 */
export function ProjectsPage() {
  const { t } = useI18n()
  const [projects, setProjects] = useState<CrmProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<unknown>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CrmProject | null>(null)
  const [memberProject, setMemberProject] = useState<CrmProject | null>(null)
  const [members, setMembers] = useState<CrmProjectMember[] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listCrmProjects()
      setProjects(result.items)
      setLoadError(null)
    } catch (error) {
      setLoadError(error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = useCallback((project: CrmProject) => {
    setEditing(project)
    setFormOpen(true)
  }, [])

  const openMembers = useCallback(
    async (project: CrmProject) => {
      setMemberProject(project)
      setMembers(null)
      try {
        const detail = await getCrmProject(project.id)
        setMembers(detail.members)
      } catch {
        setMembers([])
        notify.error(t("crm.projects.member_failed"))
      }
    },
    [t]
  )

  const addMember = async (userId: string, roleCode: string) => {
    if (!memberProject) return
    try {
      await addCrmProjectMember(memberProject.id, {
        user_id: userId,
        role_code: roleCode || undefined,
      })
      const detail = await getCrmProject(memberProject.id)
      setMembers(detail.members)
    } catch {
      notify.error(t("crm.projects.member_failed"))
    }
  }

  const removeMember = async (memberId: string) => {
    if (!memberProject) return
    try {
      await removeCrmProjectMember(memberProject.id, memberId)
      const detail = await getCrmProject(memberProject.id)
      setMembers(detail.members)
    } catch {
      notify.error(t("crm.projects.member_failed"))
    }
  }

  // Filter options follow the payload (type_code/status are free-form), so a
  // new code shows up without a frontend change.
  const typeOptions = useMemo<ProjectColumnOption[]>(() => {
    const counts = new Map<string, number>()
    for (const project of projects) {
      counts.set(project.type_code, (counts.get(project.type_code) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({ value, label: value, count }))
  }, [projects])

  const statusOptions = useMemo<ProjectColumnOption[]>(() => {
    const counts = new Map<string, number>()
    for (const project of projects) {
      counts.set(project.status, (counts.get(project.status) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, count]) => ({
        value,
        label: projectStatusLabel(t, value),
        count,
      }))
  }, [projects, t])

  const columns = useProjectColumns({
    typeOptions,
    statusOptions,
    onEdit: openEdit,
    onOpenMembers: openMembers,
  })
  const { table, total } = useClientListTable<CrmProject>({
    columns,
    items: projects,
    filterBy: {
      project_code: (item, value) =>
        matchTextColumnFilter(value, item.project_code),
      name: (item, value) => matchTextColumnFilter(value, item.name),
      type_code: (item, value) => matchSelectFilter(item.type_code, value),
      status: (item, value) => matchSelectFilter(item.status, value),
    },
    sort: (rows, sorting) =>
      sortByColumn(rows, sorting, {
        project_code: (a, b) => a.project_code.localeCompare(b.project_code),
        name: (a, b) => a.name.localeCompare(b.name),
        type_code: (a, b) => a.type_code.localeCompare(b.type_code),
        status: (a, b) => a.status.localeCompare(b.status),
      }),
    defaultPageSize: DEFAULT_PAGE_SIZE,
  })

  return (
    <>
      <ListPageShell
        title={t("crm.projects.title")}
        header={
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("crm.projects.description")}
          </p>
        }
        totalRows={total}
        meta={
          <Badge
            variant="secondary"
            className="px-2.5 py-0.5 text-[10px] font-bold"
          >
            {t("crm.projects.count", { count: total })}
          </Badge>
        }
        criticalPending={loading && projects.length === 0}
        criticalError={loadError}
        onRetry={() => void load()}
        loadErrorTitle={t("crm.projects.load_failed")}
        fetching={loading && projects.length > 0}
        table={table}
        onRowDoubleClick={(row) => openEdit(row.original)}
        toolbar={
          <ListTableToolbar
            table={table}
            onCreate={openCreate}
            createLabel={t("crm.projects.new")}
            exportFilename={t("crm.projects.title")}
            sheetName={t("crm.projects.title")}
            totalRowsCount={total}
          />
        }
      />

      {memberProject ? (
        <ProjectMembersDialog
          key={memberProject.id}
          project={memberProject}
          members={members}
          onAdd={addMember}
          onRemove={removeMember}
          onClose={() => setMemberProject(null)}
        />
      ) : null}

      <ProjectDialog
        open={formOpen}
        project={editing}
        onOpenChange={setFormOpen}
        onSaved={() => load()}
      />
    </>
  )
}
