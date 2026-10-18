import type { CaseTabItem } from "@workspace/case-tabs"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"

/** Attachments + activity-log tabs under a case form (host dialog and view). */
export function CaseTabsPanel({ tabs }: { tabs: CaseTabItem[] }) {
  if (tabs.length === 0) return null
  return (
    <Tabs defaultValue={tabs[0]?.id} className="flex flex-col gap-2">
      <TabsList className="h-auto w-fit">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className="mt-0 max-h-80 overflow-y-auto"
        >
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
