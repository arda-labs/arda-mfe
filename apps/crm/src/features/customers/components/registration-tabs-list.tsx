import { cn } from "@workspace/ui/lib/utils"
import { TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

export function CustomerRegistrationTabsList({
  isPersonal,
  canAddRelationship,
  compact = false,
}: {
  isPersonal: boolean
  canAddRelationship: boolean
  compact?: boolean
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
    </TabsList>
  )
}
