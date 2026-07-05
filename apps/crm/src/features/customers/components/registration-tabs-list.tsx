import { TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

export function CustomerRegistrationTabsList({
  isPersonal,
  canAddRelationship,
}: {
  isPersonal: boolean
  canAddRelationship: boolean
}) {
  return (
    <TabsList className="flex h-auto flex-wrap justify-start">
      <TabsTrigger value="general">Thông tin khách hàng</TabsTrigger>
      {isPersonal ? (
        <TabsTrigger value="relationships" disabled={!canAddRelationship}>
          Người có liên quan
        </TabsTrigger>
      ) : null}
    </TabsList>
  )
}