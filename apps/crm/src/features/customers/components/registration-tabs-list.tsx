import { cn } from "@workspace/ui/lib/utils"
import { TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import type { CaseTabItem } from "@workspace/case-tabs/types"

export function CustomerRegistrationTabsList({
  isPersonal,
  canAddRelationship,
  compact = false,
  systemTabs = [],
}: {
  isPersonal: boolean
  canAddRelationship: boolean
  compact?: boolean
  systemTabs?: CaseTabItem[]
}) {
  return (
    <TabsList
      className={cn(
        "flex h-auto justify-start",
        compact
          ? "scrollbar-none max-w-full flex-nowrap overflow-x-auto"
          : "flex-wrap"
      )}
    >
      <TabsTrigger value="general">Thông tin khách hàng</TabsTrigger>
      {isPersonal ? (
        <TabsTrigger value="relationships" disabled={!canAddRelationship}>
          Người có liên quan
        </TabsTrigger>
      ) : null}
      {systemTabs.map((tab) => (
        <TabsTrigger key={tab.id} value={tab.id}>
          {tab.label}
        </TabsTrigger>
      ))}
    </TabsList>
  )
}
