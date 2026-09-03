import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { PageTitle } from "@workspace/ui/components/page-title"
import { cn } from "@workspace/ui/lib/utils"

export type SettingsTabItem = {
  id: string
  label: string
  icon?: LucideIcon
  badge?: ReactNode
}

export interface SettingsTabbedShellProps {
  title: string
  description?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  tabs: SettingsTabItem[]
  activeTab: string
  onTabChange: (id: string) => void
  children: ReactNode
  sidebar?: ReactNode
  stickyActionBar?: ReactNode
  className?: string
}

export function SettingsTabbedShell({
  title,
  description,
  meta,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
  sidebar,
  stickyActionBar,
  className,
}: SettingsTabbedShellProps) {
  return (
    <div
      className={cn(
        "relative mx-auto flex h-full w-full max-w-7xl flex-col overflow-y-auto px-4 py-6 md:px-6",
        className
      )}
    >
      {/* Top Header connected to Shell PageTitle */}
      <div className="pb-3">
        <PageTitle
          title={title}
          description={description}
          meta={meta}
          actions={actions}
        />
      </div>

      {/* Sticky Tab Bar Pinned on Scroll */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border/70 bg-background/95 px-4 py-2 backdrop-blur-md md:-mx-6 md:px-6">
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-primary/10 text-primary shadow-2xs ring-1 ring-primary/25"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {Icon && <Icon className="size-3.5 shrink-0" />}
                <span>{tab.label}</span>
                {tab.badge}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Layout (Main + Sidebar) */}
      {sidebar ? (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-w-0 pb-12">{children}</div>
          <div className="min-w-0">{sidebar}</div>
        </div>
      ) : (
        <div className="min-w-0 pb-12">{children}</div>
      )}

      {/* Floating Action Bar */}
      {stickyActionBar}
    </div>
  )
}
