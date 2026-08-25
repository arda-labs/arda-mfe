import { useCallback, useEffect, useState } from "react"
import { PageErrorDialog } from "@workspace/admin-list/page-error-dialog"
import type { WorkflowCaseType, SlaPolicy } from "../api"
import { workflowApi } from "../api"
import {
  CaseTypeTable,
  LoadingBlock,
  ProcessConfigDialog,
  roleOptionsFromCaseTypes,
  WorkflowFrame,
} from "../shared/admin-ui"

export function ProcessConfigsPage() {
  const [items, setItems] = useState<WorkflowCaseType[]>([])
  const [slaItems, setSlaItems] = useState<SlaPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ct, sl] = await Promise.all([
        workflowApi.listCaseTypes(),
        workflowApi.listSlaPolicies(),
      ])
      setItems(ct)
      setSlaItems(sl)
    } catch (reason) {
      setError(reason)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

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
      source="api"
      metrics={[
        {
          label: "Loại nghiệp vụ",
          value: String(items.length),
          tone: "default",
        },
        { label: "Đang bật workflow", value: String(enabled), tone: "success" },
        {
          label: "Chưa áp dụng",
          value: String(
            items.filter((item) => item.status !== "ACTIVE").length
          ),
          tone: "warning",
        },
      ]}
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <CaseTypeTable items={items} mode="process" onEdit={setEditing} />
      )}
      <PageErrorDialog
        open={error != null && !loading}
        error={error}
        onRetry={() => void load()}
        title="Không tải được cấu hình quy trình"
      />
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
