import { useState } from "react"
import type { WorkflowCaseType } from "../api"
import { useSlaPolicies, useWorkflowCaseTypes } from "../queries"
import {
  CaseTypeTable,
  LoadingBlock,
  ProcessConfigDialog,
  roleOptionsFromCaseTypes,
  WorkflowFrame,
} from "../shared/admin-ui"

export function ProcessConfigsPage() {
  const { data, isLoading } = useWorkflowCaseTypes()
  const slaQuery = useSlaPolicies()
  const items = data?.data ?? []
  const slaItems = slaQuery.data?.data ?? []
  const [editing, setEditing] = useState<WorkflowCaseType>()
  const enabled = items.filter((item) => item.workflowEnabled).length
  const roleOptions = roleOptionsFromCaseTypes(items)
  const slaOptions = slaItems.map((item) => ({
    value: item.id,
    label: `${item.code} - ${item.name}`,
    description: item.caseType,
  }))

  return (
    <WorkflowFrame
      title="Cấu hình quy trình"
      description="Ánh xạ từng loại nghiệp vụ tới BPMN process id, version, SLA mặc định và role xử lý."
      source={data?.source}
      metrics={[
        { label: "Loại nghiệp vụ", value: String(items.length), tone: "default" },
        { label: "Đang bật workflow", value: String(enabled), tone: "success" },
        {
          label: "Chưa áp dụng",
          value: String(items.filter((item) => item.status !== "ACTIVE").length),
          tone: "warning",
        },
      ]}
    >
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <CaseTypeTable items={items} mode="process" onEdit={setEditing} />
      )}
      {editing ? (
        <ProcessConfigDialog
          item={editing}
          roleOptions={roleOptions}
          slaOptions={slaOptions}
          onOpenChange={(open) => !open && setEditing(undefined)}
        />
      ) : null}
    </WorkflowFrame>
  )
}