import { Link } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { getAuthScope, useAuthStore } from "@workspace/auth/store"
import { PageHeader } from "@workspace/ui/components/page-header"
import {
  filterNavItems,
  getNavLabel,
  type NavNode,
} from "./config/nav-config"
import { useDynamicNavItems } from "./config/use-dynamic-nav"

function firstHref(node: NavNode): string | undefined {
  if (node.href) return node.href
  for (const child of node.children ?? []) {
    const href = firstHref(child)
    if (href) return href
  }
  return undefined
}

function countLeaves(node: NavNode): number {
  if (!node.children?.length) return node.href ? 1 : 0
  return node.children.reduce((sum, child) => sum + countLeaves(child), 0)
}

export function Dashboard() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const { items } = useDynamicNavItems(getAuthScope(user))
  const modules = filterNavItems(items, user).filter(
    (node) => node.href !== "/" && firstHref(node)
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-4 sm:p-5">
      <PageHeader
        title={t("dashboard.greeting", { name: user?.name ?? "" })}
        description={t("dashboard.subtitle")}
      />
      <section aria-labelledby="dashboard-modules" className="space-y-3">
        <h2 id="dashboard-modules" className="text-sm font-medium text-muted-foreground">
          {t("dashboard.modules")}
        </h2>
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboard.empty")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {modules.map((node) => {
              const Icon = node.icon
              const href = firstHref(node) as string
              const count = countLeaves(node)
              return (
                <li key={node.id ?? node.href ?? node.labelKey ?? node.label}>
                  <Link
                    to={href}
                    className="flex h-full items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand-accent/10 text-brand-accent">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {getNavLabel(node, t)}
                      </span>
                      {count > 1 ? (
                        <span className="block text-xs text-muted-foreground">
                          {t("dashboard.items_count", { count })}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
