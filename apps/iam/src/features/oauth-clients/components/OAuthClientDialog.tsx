import { useState } from "react"
import { translateApiError, useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { notify } from "@workspace/ui/feedback/notify"
import { oauthClientsApi, type OAuthClient } from "../api"

type FormState = {
  client_id: string
  client_name: string
  redirect_uris: string
  grant_types: string
  scope: string
  token_endpoint_auth_method: string
}

const EMPTY: FormState = {
  client_id: "",
  client_name: "",
  redirect_uris: "",
  grant_types: "authorization_code,refresh_token",
  scope: "openid offline_access",
  token_endpoint_auth_method: "client_secret_basic",
}

function toForm(client: OAuthClient | null): FormState {
  if (!client) return { ...EMPTY }
  return {
    client_id: client.client_id,
    client_name: client.client_name ?? "",
    redirect_uris: (client.redirect_uris ?? []).join(", "),
    grant_types: (client.grant_types ?? ["authorization_code"]).join(","),
    scope: client.scope ?? "",
    token_endpoint_auth_method:
      client.token_endpoint_auth_method ?? "client_secret_basic",
  }
}

type OAuthClientDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** `null` = create mode; a client = edit mode. */
  client: OAuthClient | null
  /** Called after a successful save so the page can refresh its list. */
  onSaved?: () => void | Promise<void>
}

/** Create/update dialog for one OAuth2 client (Hydra admin proxy). */
export function OAuthClientDialog({
  open,
  onOpenChange,
  client,
  onSaved,
}: OAuthClientDialogProps) {
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>(() => toForm(client))
  const [saving, setSaving] = useState(false)

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
    if (!client && form.client_id.trim()) {
      payload.client_id = form.client_id.trim()
    }
    setSaving(true)
    try {
      await oauthClientsApi.save(client?.client_id ?? null, payload)
      notify.success(t("admin.oauth_clients.save_success"))
      onOpenChange(false)
      await onSaved?.()
    } catch (err) {
      notify.error(t("admin.oauth_clients.save_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {client
              ? t("admin.oauth_clients.edit")
              : t("admin.oauth_clients.create")}
          </DialogTitle>
        </DialogHeader>
        <form
          autoComplete="off"
          className="grid grid-cols-2 gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <div className="space-y-1.5">
            <Label>{t("admin.oauth_clients.field.client_id")}</Label>
            <Input
              value={form.client_id}
              disabled={Boolean(client)}
              className="font-mono"
              placeholder={t("admin.oauth_clients.placeholder.client_id")}
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
              placeholder={t("admin.oauth_clients.placeholder.redirect_uris")}
              onChange={(e) =>
                setForm({ ...form, redirect_uris: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.oauth_clients.field.scope")}</Label>
            <Input
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.oauth_clients.field.grant_types")}</Label>
            <Input
              value={form.grant_types}
              className="font-mono text-xs"
              onChange={(e) =>
                setForm({ ...form, grant_types: e.target.value })
              }
            />
          </div>
          <div className="col-span-2 space-y-1.5">
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
          <div className="col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("common.action.cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {t("common.action.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
