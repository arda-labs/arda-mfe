import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { DescriptionTemplate } from "../api"
import { useDescriptionTemplates, useWorkflowCaseTypes } from "../queries"
import {
  businessSubsystemOptions,
  caseTypeOptionsFromCaseTypes,
  DescriptionTemplateDialog,
  DescriptionTemplateTable,
  LoadingBlock,
  WorkflowFrame,
} from "../shared/admin-ui"

export function DescriptionTemplatesPage() {
  const { data, isLoading } = useDescriptionTemplates()
  const caseTypesQuery = useWorkflowCaseTypes()
  const items = data?.data ?? []
  const caseTypeOptions = caseTypeOptionsFromCaseTypes(caseTypesQuery.data?.data ?? [])
  const [editing, setEditing] = useState<DescriptionTemplate | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <WorkflowFrame
      title="Cấu trúc diễn giải"
      description="Chuẩn hóa cách sinh tiêu đề, mô tả và dòng timeline để các danh sách dễ quét."
      source={data?.source}
      action={<Button type="button" size="sm" onClick={() => setCreateOpen(true)}>Tạo cấu trúc</Button>}
    >
      {isLoading ? (
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
        />
      ) : null}
      {editing ? (
        <DescriptionTemplateDialog
          item={editing}
          open
          caseTypeOptions={caseTypeOptions}
          subsystemOptions={businessSubsystemOptions}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </WorkflowFrame>
  )
}