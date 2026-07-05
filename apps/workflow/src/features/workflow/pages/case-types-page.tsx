import { useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type { WorkflowCaseType } from "../api"
import { useWorkflowCaseTypes } from "../queries"
import {
  CaseTypeDialog,
  CaseTypeTable,
  defaultBusinessAreaOptions,
  LoadingBlock,
  roleOptionsFromCaseTypes,
  uniqueOptions,
  WorkflowFrame,
} from "../shared/admin-ui"

export function CaseTypesPage() {
  const { data, isLoading } = useWorkflowCaseTypes()
  const items = data?.data ?? []
  const [editing, setEditing] = useState<WorkflowCaseType | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const businessAreas = new Set(items.map((item) => item.businessArea)).size
  const businessAreaOptions = uniqueOptions(items.map((item) => item.businessArea), defaultBusinessAreaOptions)
  const roleOptions = roleOptionsFromCaseTypes(items)

  return (
    <WorkflowFrame
      title="Danh mục loại nghiệp vụ"
      description="Quản lý mã nghiệp vụ, khu vực menu, service sở hữu và trạng thái áp dụng."
      source={data?.source}
      metrics={[
        { label: "Loại nghiệp vụ", value: String(items.length), tone: "default" },
        { label: "Nhóm menu", value: String(businessAreas), tone: "success" },
        {
          label: "Bản nháp",
          value: String(items.filter((item) => item.status !== "ACTIVE").length),
          tone: "warning",
        },
      ]}
      action={<Button type="button" size="sm" onClick={() => setCreateOpen(true)}>Tạo loại nghiệp vụ</Button>}
    >
      {isLoading ? (
        <LoadingBlock />
      ) : (
        <CaseTypeTable items={items} mode="catalog" onEdit={setEditing} />
      )}
      {createOpen ? (
        <CaseTypeDialog
          open
          businessAreaOptions={businessAreaOptions}
          roleOptions={roleOptions}
          onOpenChange={setCreateOpen}
        />
      ) : null}
      {editing ? (
        <CaseTypeDialog
          item={editing}
          open
          businessAreaOptions={businessAreaOptions}
          roleOptions={roleOptions}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      ) : null}
    </WorkflowFrame>
  )
}