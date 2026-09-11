import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  addCrmProjectMember,
  createCrmProject,
  getCrmProject,
  listCrmProjects,
  removeCrmProjectMember,
  updateCrmProject,
  type CrmProject,
  type CrmProjectMember,
} from "../api"

/** CRM projects: catalog + members (W7). */
export function ProjectsPage() {
  const { t } = useI18n()
  const [projects, setProjects] = useState<CrmProject[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [editing, setEditing] = useState<CrmProject | null>(null)
  const [form, setForm] = useState({
    project_code: "",
    name: "",
    type_code: "",
    start_date: "",
    end_date: "",
    description: "",
  })
  const [members, setMembers] = useState<CrmProjectMember[]>([])
  const [memberProject, setMemberProject] = useState<CrmProject | null>(null)
  const [memberUser, setMemberUser] = useState("")
  const [memberRole, setMemberRole] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const result = await listCrmProjects()
      setProjects(result.items)
    } catch {
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setEditing(null)
    setForm({ project_code: "", name: "", type_code: "", start_date: "", end_date: "", description: "" })
  }

  const save = async () => {
    if (!form.project_code.trim() || !form.name.trim() || !form.type_code.trim()) {
      notify.error(t("crm.projects.validation.required"))
      return
    }
    try {
      if (editing) {
        await updateCrmProject(editing.id, { ...form, status: editing.status })
      } else {
        await createCrmProject({ ...form, status: "ACTIVE" })
      }
      notify.success(t("crm.projects.save_success"))
      resetForm()
      await load()
    } catch {
      notify.error(t("crm.projects.save_failed"))
    }
  }

  const openMembers = async (project: CrmProject) => {
    setMemberProject(project)
    setMemberUser("")
    setMemberRole("")
    try {
      const detail = await getCrmProject(project.id)
      setMembers(detail.members)
    } catch {
      setMembers([])
    }
  }

  const addMember = async () => {
    if (!memberProject || !memberUser.trim()) return
    try {
      await addCrmProjectMember(memberProject.id, {
        user_id: memberUser.trim(),
        role_code: memberRole || undefined,
      })
      setMemberUser("")
      setMemberRole("")
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

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("crm.projects.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("crm.projects.description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-4 md:grid-cols-4">
        <div className="space-y-1.5">
          <Label>{t("crm.projects.field.code")}</Label>
          <Input
            value={form.project_code}
            disabled={Boolean(editing)}
            className="font-mono"
            onChange={(e) => setForm({ ...form, project_code: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("common.field.name")}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("crm.projects.field.type")}</Label>
          <Input
            value={form.type_code}
            className="font-mono"
            onChange={(e) => setForm({ ...form, type_code: e.target.value.toUpperCase() })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("crm.projects.field.start")}</Label>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("crm.projects.field.end")}</Label>
          <Input
            type="date"
            value={form.end_date}
            onChange={(e) => setForm({ ...form, end_date: e.target.value })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>{t("crm.projects.field.description")}</Label>
          <Input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={() => void save()}>{t("common.action.save")}</Button>
          {editing && (
            <Button variant="outline" onClick={resetForm}>
              {t("common.action.cancel")}
            </Button>
          )}
        </div>
      </div>

      {loadFailed && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t("crm.projects.load_failed")}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("crm.projects.field.code")}</th>
              <th className="px-3 py-2">{t("common.field.name")}</th>
              <th className="px-3 py-2">{t("crm.projects.field.type")}</th>
              <th className="px-3 py-2">{t("common.field.status")}</th>
              <th className="px-3 py-2 text-right">{t("common.field.action")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                  {t("crm.projects.empty")}
                </td>
              </tr>
            )}
            {projects.map((project) => (
              <tr key={project.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">
                  {project.project_code}
                </td>
                <td className="px-3 py-2 font-medium">{project.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{project.type_code}</td>
                <td className="px-3 py-2">
                  <Badge variant={project.status === "ACTIVE" ? "default" : "outline"}>
                    {project.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() => {
                        setEditing(project)
                        setForm({
                          project_code: project.project_code,
                          name: project.name,
                          type_code: project.type_code,
                          start_date: project.start_date ?? "",
                          end_date: project.end_date ?? "",
                          description: project.description ?? "",
                        })
                      }}
                    >
                      {t("common.action.edit")}
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() => void openMembers(project)}
                    >
                      {t("crm.projects.members")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {memberProject && (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {t("crm.projects.members")} · {memberProject.project_code}
            </h2>
            <Button size="sm" variant="outline" onClick={() => setMemberProject(null)}>
              {t("common.action.close")}
            </Button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label>{t("crm.projects.field.user")}</Label>
              <Input value={memberUser} onChange={(e) => setMemberUser(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("crm.projects.field.role")}</Label>
              <Input value={memberRole} onChange={(e) => setMemberRole(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => void addMember()}>
              {t("common.action.create")}
            </Button>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {members.length === 0 && (
                <tr>
                  <td className="px-2 py-2 text-center text-muted-foreground">
                    {t("crm.projects.empty_members")}
                  </td>
                </tr>
              )}
              {members.map((member) => (
                <tr key={member.id} className="border-t border-border">
                  <td className="px-2 py-2 font-mono text-xs">{member.user_id}</td>
                  <td className="px-2 py-2 text-xs">{member.role_code || "—"}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      className="text-xs font-semibold text-destructive hover:underline"
                      onClick={() => void removeMember(member.id)}
                    >
                      {t("common.action.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
