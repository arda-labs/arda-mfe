import { useCallback, useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { PageErrorDialog } from "@workspace/admin-list/page-error-dialog"
import type { WorkflowCaseType } from "../api"
import { workflowApi } from "../api"
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
  const [items, setItems] = useState<WorkflowCaseType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await workflowApi.listCaseTypes())
    } catch (reason) {
      setError(reason)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const [editing, setEditing] = useState<WorkflowCaseType | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const businessAreas = new Set(items.map((item) => item.businessArea)).size
  const businessAreaOptions = uniqueOptions(
    items.map((item) => item.businessArea),
    defaultBusinessAreaOptions
  )
  const roleOptions = roleOptionsFromCaseTypes(items)
  function onSaved() {
    void load()
  }

  return (
    <WorkflowFrame
      title="Danh mục loại nghiệp vụ"
      description="Quản lý mã nghiệp vụ, khu vực menu, service sở hữu và trạng thái áp dụng."
      source="api"
      metrics={[
        {
          label: "Loại nghiệp vụ",
          value: String(items.length),
          tone: "default",
        },
        { label: "Nhóm menu", value: String(businessAreas), tone: "success" },
        {
          label: "Bản nháp",
          value: String(
            items.filter((item) => item.status !== "ACTIVE").length
          ),
          tone: "warning",
        },
      ]}
      action={
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          Tạo loại nghiệp vụ
        </Button>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <CaseTypeTable items={items} mode="catalog" onEdit={setEditing} />
      )}
      <PageErrorDialog
        open={error != null && !loading}
        error={error}
        onRetry={() => void load()}
        title="Không tải được danh mục loại nghiệp vụ"
      />
      {createOpen ? (
        <CaseTypeDialog
          open
          businessAreaOptions={businessAreaOptions}
          roleOptions={roleOptions}
          onOpenChange={setCreateOpen}
          onSaved={onSaved}
        />
      ) : null}
      {editing ? (
        <CaseTypeDialog
          item={editing}
          open
          businessAreaOptions={businessAreaOptions}
          roleOptions={roleOptions}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={onSaved}
        />
      ) : null}
    </WorkflowFrame>
  )
}
