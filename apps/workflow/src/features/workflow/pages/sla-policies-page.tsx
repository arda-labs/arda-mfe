import { useCallback, useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { PageErrorDialog } from "@workspace/admin-list/page-error-dialog"
import type { SlaPolicy, WorkflowCaseType } from "../api"
import { workflowApi } from "../api"
import {
  caseTypeOptionsFromCaseTypes,
  LoadingBlock,
  SlaPolicyDialog,
  SlaTable,
  uniqueOptions,
  WorkflowFrame,
} from "../shared/admin-ui"

export function SlaPoliciesPage() {
  const [items, setItems] = useState<SlaPolicy[]>([])
  const [caseTypes, setCaseTypes] = useState<WorkflowCaseType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sl, ct] = await Promise.all([
        workflowApi.listSlaPolicies(),
        workflowApi.listCaseTypes(),
      ])
      setItems(sl)
      setCaseTypes(ct)
    } catch (reason) {
      setError(reason)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  const caseTypeOptions = caseTypeOptionsFromCaseTypes(caseTypes)
  const roleOptions = uniqueOptions(
    items.map((item) => item.escalationRole),
    []
  )
  const [editing, setEditing] = useState<SlaPolicy | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  function onSaved() {
    void load()
  }

  return (
    <WorkflowFrame
      title="Cấu hình SLA"
      description="Định nghĩa thời hạn xử lý, ngưỡng cảnh báo và role escalations cho từng nghiệp vụ."
      source="api"
      action={
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
          Tạo SLA
        </Button>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <SlaTable items={items} onEdit={setEditing} />
      )}
      <PageErrorDialog
        open={error != null && !loading}
        error={error}
        onRetry={() => void load()}
        title="Không tải được cấu hình SLA"
      />
      {createOpen ? (
        <SlaPolicyDialog
          open
          caseTypeOptions={caseTypeOptions}
          roleOptions={roleOptions}
          onOpenChange={setCreateOpen}
          onSaved={onSaved}
        />
      ) : null}
      {editing ? (
        <SlaPolicyDialog
          item={editing}
          open
          caseTypeOptions={caseTypeOptions}
          roleOptions={roleOptions}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={onSaved}
        />
      ) : null}
    </WorkflowFrame>
  )
}
