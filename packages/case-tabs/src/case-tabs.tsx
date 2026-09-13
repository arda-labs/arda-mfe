import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import type { CaseTabItem } from "./types"

/**
 * Minimal data-driven tab renderer for screens that do not own a tab layout.
 * Screens that already have one (PostingTabsShell, formation tabs, CRM/HRM
 * registration pages) just spread `useCaseTabs(...)` into their own Tabs.
 */
export function CaseTabs({
  tabs,
  defaultValue,
}: {
  tabs: CaseTabItem[]
  defaultValue?: string
}) {
  if (tabs.length === 0) return null
  return (
    <Tabs
      defaultValue={defaultValue ?? tabs[0]?.id}
      className="flex flex-col gap-3"
    >
      <div className="sticky top-0 z-10 border-b bg-background px-1 py-1">
        <TabsList className="flex h-auto flex-wrap justify-start">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div className="space-y-4">
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-0">
            {tab.content}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  )
}
