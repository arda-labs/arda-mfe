import { useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import { DataTable } from "@workspace/ui/components/data-table/data-table"
import { PageErrorDialog } from "@workspace/list-page/page-error-dialog"
import { PageHeader } from "@workspace/ui/components/page-header"
import { PageLoadOverlay } from "@workspace/list-page/page-load-overlay"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { useDelayedBusy } from "@workspace/ui/hooks/use-delayed-busy"
import { caseTypeOptionsOf, useCaseTypesLookup } from "./process-roles/tab-list"
import { useCatalogTab } from "./process-roles/use-catalog-tab"
import { useMembershipTab } from "./process-roles/use-membership-tab"
import { useAssignmentTab } from "./process-roles/use-assignment-tab"
import { useDelegationTab } from "./process-roles/use-delegation-tab"
import { useMappingTab } from "./process-roles/use-mapping-tab"
import type { ProcessRolesTab } from "./process-roles/tab-list"

/**
 * Vai trò quy trình — 5 tabs, mỗi tab là 1 client-tier list độc lập với
 * error state riêng (useTabList per tab; lỗi 1 tab không xóa dữ liệu tab
 * khác). Toàn bộ trang dùng chung 1 khung bảng full-trang; toolbar + dialogs
 * của tab đang mở được truyền xuống panel đó.
 */
export function ProcessRolesPage() {
  const { t } = useI18n()
  const [activeKey, setActiveKey] = useState(catalogTabKey)
  const caseTypeQuery = useCaseTypesLookup()
  const caseTypeOptions = useMemo(
    () => caseTypeOptionsOf(caseTypeQuery.data ?? []),
    [caseTypeQuery.data]
  )

  const catalog = useCatalogTab()
  const membership = useMembershipTab(catalog.roleCodeOptions)
  const assignment = useAssignmentTab(caseTypeOptions, catalog.roleCodeOptions)
  const delegation = useDelegationTab(catalog.roleCodeOptions)
  const mapping = useMappingTab(caseTypeOptions, catalog.roleCodeOptions)

  const tabs: ProcessRolesTab[] = [
    catalog,
    membership,
    assignment,
    delegation,
    mapping,
  ]
  const active = tabs.find((tab) => tab.key === activeKey) ?? catalog

  return (
    <section className="flex h-full min-h-0 flex-col gap-5 overflow-hidden p-4 sm:p-5">
      <PageHeader
        title={t("workflow.process_roles.title")}
        meta={
          <Badge
            variant="secondary"
            className="px-2.5 py-0.5 text-[10px] font-bold"
          >
            {active.countLabel}
          </Badge>
        }
      />
      <p className="max-w-3xl text-sm text-muted-foreground">
        {t("workflow.process_roles.description")}
      </p>
      <Tabs value={active.key} onValueChange={setActiveKey}>
        <TabsList className="flex h-auto flex-wrap justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {t(`workflow.process_roles.tab_${tab.key}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <TabPanel key={active.key} tab={active} />
    </section>
  )
}

const catalogTabKey = "catalog"

function TabPanel({ tab }: { tab: ProcessRolesTab }) {
  const { t } = useI18n()
  const showOverlay = useDelayedBusy(tab.criticalPending)
  const showErrorDialog = tab.criticalError != null && !tab.criticalPending

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <DataTable
        layout="panel"
        table={tab.table}
        totalRows={tab.total}
        className="min-h-0 flex-1"
        fetching={tab.fetching}
      >
        {tab.toolbar}
      </DataTable>
      {showOverlay ? <PageLoadOverlay /> : null}
      <PageErrorDialog
        open={showErrorDialog}
        error={tab.criticalError}
        onRetry={tab.onRetry}
        title={t("workflow.process_roles.load_failed")}
      />
      {tab.dialogs}
    </div>
  )
}
