import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { SlaPolicy } from "../api"
import { useSlaPolicies, useWorkflowCaseTypes } from "../queries"
import {
  caseTypeOptionsFromCaseTypes,
  LoadingBlock,
  SlaPolicyDialog,
  SlaTable,
  uniqueOptions,
  WorkflowFrame,
} from "../shared/admin-ui"

export function SlaPoliciesPage() {
  const { data, isLoading } = useSlaPolicies()
  const caseTypesQuery = useWorkflowCaseTypes()
  const items = data?.data ?? []
  const caseTypeOptions = caseTypeOptionsFromCaseTypes(caseTypesQuery.data?.data ?? [])
  const roleOptions = uniqueOptions(items.map((item) => item.escalationRole), [])
  const [editing, setEditing] = useState<SlaPolicy | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <WorkflowFrame
      title="Cấu hình SLA"
      description="Định nghĩa thời hạn xử lý, ngưỡng cảnh báo và role escalations cho từng nghiệp vụ."
      source={data?.source}
      action={<Button type="button" size="sm" onClick={() => setCreateOpen(true)}>Tạo SLA</Button>}
    >
      {isLoading ? <LoadingBlock /> : <SlaTable items={items} onEdit={setEditing} />}
      {createOpen ? (
        <SlaPolicyDialog
          open
          caseTypeOptions={caseTypeOptions}
          roleOptions={roleOptions}
          onOpenChange={setCreateOpen}
        />
      ) : null}
      {editing ? (
        <SlaPolicyDialog
          item={editing}
          open
          caseTypeOptions={caseTypeOptions}
          roleOptions={roleOptions}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </WorkflowFrame>
  )
}