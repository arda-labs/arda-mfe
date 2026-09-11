import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { getCanonicalList, postCanonical, putCanonical, deleteCanonical } from "@workspace/api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

interface OAuthClient {
  client_id: string
  client_name?: string
  redirect_uris?: string[]
  grant_types?: string[]
  scope?: string
  token_endpoint_auth_method?: string
}

const EMPTY = {
  client_id: "",
  client_name: "",
  redirect_uris: "",
  grant_types: "authorization_code,refresh_token",
  scope: "openid offline_access",
  token_endpoint_auth_method: "client_secret_basic",
}

/** OAuth2 client registry (Hydra admin proxy, X3). */
export function OAuthClientsPage() {
  const { t } = useI18n()
  const [clients, setClients] = useState<OAuthClient[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [editing, setEditing] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    try {
      const result = await getCanonicalList<OAuthClient>("/api/admin/oauth-clients")
      setClients(result.items)
    } catch {
      setClients([])
      setLoadFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const edit = (client: OAuthClient) => {
    setEditing(client.client_id)
    setForm({
      client_id: client.client_id,
      client_name: client.client_name ?? "",
      redirect_uris: (client.redirect_uris ?? []).join(", "),
      grant_types: (client.grant_types ?? ["authorization_code"]).join(","),
      scope: client.scope ?? "",
      token_endpoint_auth_method:
        client.token_endpoint_auth_method ?? "client_secret_basic",
    })
  }

  const reset = () => {
    setEditing(null)
    setForm({ ...EMPTY })
  }

  const save = async () => {
    if (!form.client_name.trim() || !form.redirect_uris.trim()) {
      notify.error(t("admin.oauth_clients.validation.required"))
      return
    }
    const payload: Record<string, unknown> = {
      client_name: form.client_name.trim(),
      redirect_uris: form.redirect_uris
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      grant_types: form.grant_types
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      response_types: ["code"],
      scope: form.scope.trim(),
      token_endpoint_auth_method: form.token_endpoint_auth_method,
    }
    if (!editing && form.client_id.trim()) payload.client_id = form.client_id.trim()
    try {
      if (editing) {
        await putCanonical(`/api/admin/oauth-clients/${encodeURIComponent(editing)}`, payload)
      } else {
        await postCanonical("/api/admin/oauth-clients", payload)
      }
      notify.success(t("admin.oauth_clients.save_success"))
      reset()
      await load()
    } catch {
      notify.error(t("admin.oauth_clients.save_failed"))
    }
  }

  const remove = async (clientId: string) => {
    try {
      await deleteCanonical(`/api/admin/oauth-clients/${encodeURIComponent(clientId)}`)
      await load()
    } catch {
      notify.error(t("admin.oauth_clients.save_failed"))
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-auto p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("admin.oauth_clients.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("admin.oauth_clients.description")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-4">
        <div className="space-y-1.5">
          <Label>{t("admin.oauth_clients.field.client_id")}</Label>
          <Input
            value={form.client_id}
            disabled={Boolean(editing)}
            className="font-mono"
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("admin.oauth_clients.field.client_name")}</Label>
          <Input
            value={form.client_name}
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
          />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label>{t("admin.oauth_clients.field.redirect_uris")}</Label>
          <Input
            value={form.redirect_uris}
            placeholder="https://app.arda.io.vn/callback"
            onChange={(e) => setForm({ ...form, redirect_uris: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t("admin.oauth_clients.field.scope")}</Label>
          <Input value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("admin.oauth_clients.field.auth_method")}</Label>
          <select
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.token_endpoint_auth_method}
            onChange={(e) =>
              setForm({ ...form, token_endpoint_auth_method: e.target.value })
            }
          >
            <option value="client_secret_basic">client_secret_basic</option>
            <option value="client_secret_post">client_secret_post</option>
            <option value="none">none (public)</option>
          </select>
        </div>
        <div className="col-span-2 flex gap-2">
          <Button onClick={() => void save()}>{t("common.action.save")}</Button>
          {editing && (
            <Button variant="outline" onClick={reset}>
              {t("common.action.cancel")}
            </Button>
          )}
        </div>
      </div>

      {loadFailed && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {t("admin.oauth_clients.load_failed")}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("admin.oauth_clients.field.client_id")}</th>
              <th className="px-3 py-2">{t("admin.oauth_clients.field.client_name")}</th>
              <th className="px-3 py-2">{t("admin.oauth_clients.field.redirect_uris")}</th>
              <th className="px-3 py-2">{t("admin.oauth_clients.field.scope")}</th>
              <th className="px-3 py-2">{t("admin.oauth_clients.field.auth_method")}</th>
              <th className="px-3 py-2 text-right">{t("common.field.action")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!loading && clients.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                  {t("admin.oauth_clients.empty")}
                </td>
              </tr>
            )}
            {clients.map((client) => (
              <tr key={client.client_id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs font-semibold text-primary">
                  {client.client_id}
                </td>
                <td className="px-3 py-2">{client.client_name ?? "—"}</td>
                <td className="max-w-[280px] truncate px-3 py-2 font-mono text-xs">
                  {(client.redirect_uris ?? []).join(", ")}
                </td>
                <td className="px-3 py-2 text-xs">{client.scope ?? "—"}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline">
                    {client.token_endpoint_auth_method ?? "client_secret_basic"}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() => edit(client)}
                    >
                      {t("common.action.edit")}
                    </button>
                    <button
                      type="button"
                      className="text-xs font-semibold text-destructive hover:underline"
                      onClick={() => void remove(client.client_id)}
                    >
                      {t("common.action.delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
