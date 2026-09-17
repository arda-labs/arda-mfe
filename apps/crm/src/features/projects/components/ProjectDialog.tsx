import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { createCrmProject, updateCrmProject, type CrmProject } from "../../api"
import { ProjectForm, type ProjectFormValues } from "./ProjectForm"

/** Create/edit dialog for the CRM project catalog. `project === null` = create. */
export function ProjectDialog({
  open,
  project,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  project: CrmProject | null
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<void> | void
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const editing = project !== null

  const submit = async (values: ProjectFormValues) => {
    if (
      !values.project_code.trim() ||
      !values.name.trim() ||
      !values.type_code.trim()
    ) {
      notify.error(t("crm.projects.validation.required"))
      return
    }
    setSaving(true)
    try {
      if (project) {
        await updateCrmProject(project.id, { ...values, status: project.status })
      } else {
        await createCrmProject({ ...values, status: "ACTIVE" })
      }
      notify.success(t("crm.projects.save_success"))
      onOpenChange(false)
      await onSaved()
    } catch {
      notify.error(t("crm.projects.save_failed"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {editing
              ? t("crm.projects.dialog.edit_title")
              : t("crm.projects.dialog.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("crm.projects.dialog.description")}
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          key={project?.id ?? "create"}
          project={project}
          saving={saving}
          onSubmit={(values) => void submit(values)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
