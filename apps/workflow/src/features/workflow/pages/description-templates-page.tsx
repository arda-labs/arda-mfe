import { useCallback, useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { DescriptionTemplate, WorkflowCaseType } from "../api"
import { workflowApi } from "../api"
import {
  businessSubsystemOptions,
  caseTypeOptionsFromCaseTypes,
  DescriptionTemplateDialog,
  DescriptionTemplateTable,
  LoadingBlock,
  WorkflowFrame,
} from "../shared/admin-ui"

export function DescriptionTemplatesPage() {
  const [items, setItems] = useState<DescriptionTemplate[]>([])
  const [caseTypes, setCaseTypes] = useState<WorkflowCaseType[]>([])
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [dt, ct] = await Promise.all([workflowApi.listDescriptionTemplates(), workflowApi.listCaseTypes()])
      setItems(dt)
      setCaseTypes(ct)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const caseTypeOptions = caseTypeOptionsFromCaseTypes(caseTypes)
  const [editing, setEditing] = useState<DescriptionTemplate | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  function onSaved() { void load() }

  return (
    <WorkflowFrame
      title="Cấu trúc diễn giải"
      description="Chuẩn hóa cách sinh tiêu đề, mô tả và dòng timeline để các danh sách dễ quét."
      source="api"
      action={<Button type="button" size="sm" onClick={() => setCreateOpen(true)}>Tạo cấu trúc</Button>}
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <DescriptionTemplateTable items={items} onEdit={setEditing} />
      )}
      {createOpen ? (
        <DescriptionTemplateDialog
          open
          caseTypeOptions={caseTypeOptions}
          subsystemOptions={businessSubsystemOptions}
          onOpenChange={setCreateOpen}
          onSaved={onSaved}
        />
      ) : null}
      {editing ? (
        <DescriptionTemplateDialog
          item={editing}
          open
          caseTypeOptions={caseTypeOptions}
          subsystemOptions={businessSubsystemOptions}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={onSaved}
        />
      ) : null}
    </WorkflowFrame>
  )
}
