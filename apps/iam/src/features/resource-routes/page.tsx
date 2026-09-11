import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { getCanonicalList } from "@workspace/api"
import { Badge } from "@workspace/ui/components/badge"

interface PolicyRoute {
  id: string
  path: string
  methods?: string[]
  auth: boolean
  risk?: string
  permissions?: string[]
}

/** Route-policy browser (resource-management, W6a) — read-only. */
export function ResourceRoutesPage() {
  const { t } = useI18n()
  const [routes, setRoutes] = useState<PolicyRoute[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [q, setQ] = useState("")

  useEffect(() => {
    void getCanonicalList<PolicyRoute>("/api/admin/policy-routes")
      .then((result) => {
        setRoutes(result.items)
        setLoadError(false)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  const filtered = routes.filter((route) => {
    if (!q) return true
    const haystack = `${route.id} ${route.path} ${(route.permissions ?? []).join(" ")}`
    return haystack.toLowerCase().includes(q.toLowerCase())
  })

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("admin.resource_routes.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("admin.resource_routes.description")}
          </p>
        </div>
        <input
          className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
          placeholder={t("admin.resource_routes.search")}
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("admin.resource_routes.col.id")}</th>
              <th className="px-3 py-2">{t("admin.resource_routes.col.path")}</th>
              <th className="px-3 py-2">{t("admin.resource_routes.col.methods")}</th>
              <th className="px-3 py-2">{t("admin.resource_routes.col.auth")}</th>
              <th className="px-3 py-2">{t("admin.resource_routes.col.risk")}</th>
              <th className="px-3 py-2">{t("admin.resource_routes.col.permissions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t("admin.resource_routes.loading")}
                </td>
              </tr>
            )}
            {!loading && loadError && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t("admin.resource_routes.load_failed")}
                </td>
              </tr>
            )}
            {!loading && !loadError && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t("admin.resource_routes.empty")}
                </td>
              </tr>
            )}
            {filtered.map((route) => (
              <tr key={route.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">
                  {route.id}
                </td>
                <td className="px-3 py-2 font-mono text-xs">{route.path}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {(route.methods ?? []).join(", ") || t("admin.resource_routes.all_methods")}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={route.auth ? "default" : "outline"}>
                    {route.auth
                      ? t("admin.resource_routes.auth_required")
                      : t("admin.resource_routes.public")}
                  </Badge>
                </td>
                <td className="px-3 py-2">{route.risk ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {(route.permissions ?? []).join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
