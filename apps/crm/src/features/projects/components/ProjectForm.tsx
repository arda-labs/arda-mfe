import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import type { CrmProject } from "../../api"

export interface ProjectFormValues {
  project_code: string
  name: string
  type_code: string
  start_date: string
  end_date: string
  description: string
}

function projectFormValues(project: CrmProject | null): ProjectFormValues {
  return {
    project_code: project?.project_code ?? "",
    name: project?.name ?? "",
    type_code: project?.type_code ?? "",
    start_date: project?.start_date ?? "",
    end_date: project?.end_date ?? "",
    description: project?.description ?? "",
  }
}

/** Create/edit form for a CRM project — rendered inside `ProjectDialog`. */
export function ProjectForm({
  project,
  saving,
  onSubmit,
  onCancel,
}: {
  project: CrmProject | null
  saving: boolean
  onSubmit: (values: ProjectFormValues) => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [values, setValues] = useState<ProjectFormValues>(() =>
    projectFormValues(project)
  )

  const update = (patch: Partial<ProjectFormValues>) => {
    setValues((previous) => ({ ...previous, ...patch }))
  }

  return (
    <form
      autoComplete="off"
      className="grid grid-cols-2 gap-3"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(values)
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="crm_project_code">{t("crm.projects.field.code")}</Label>
        <Input
          id="crm_project_code"
          value={values.project_code}
          disabled={project !== null}
          className="font-mono"
          onChange={(event) =>
            update({ project_code: event.target.value.toUpperCase() })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="crm_project_name">{t("common.field.name")}</Label>
        <Input
          id="crm_project_name"
          value={values.name}
          onChange={(event) => update({ name: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="crm_project_type">{t("crm.projects.field.type")}</Label>
        <Input
          id="crm_project_type"
          value={values.type_code}
          className="font-mono"
          onChange={(event) =>
            update({ type_code: event.target.value.toUpperCase() })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="crm_project_start">{t("crm.projects.field.start")}</Label>
        <Input
          id="crm_project_start"
          type="date"
          value={values.start_date}
          onChange={(event) => update({ start_date: event.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="crm_project_end">{t("crm.projects.field.end")}</Label>
        <Input
          id="crm_project_end"
          type="date"
          value={values.end_date}
          onChange={(event) => update({ end_date: event.target.value })}
        />
      </div>
      <div className="col-span-2 space-y-1.5">
        <Label htmlFor="crm_project_description">
          {t("crm.projects.field.description")}
        </Label>
        <Input
          id="crm_project_description"
          value={values.description}
          onChange={(event) => update({ description: event.target.value })}
        />
      </div>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("common.action.cancel")}
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? t("common.action.saving") : t("common.action.save")}
        </Button>
      </div>
    </form>
  )
}
