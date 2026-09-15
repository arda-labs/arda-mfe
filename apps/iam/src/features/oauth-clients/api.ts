import {
  deleteCanonical,
  getCanonicalList,
  postCanonical,
  putCanonical,
} from "@workspace/api"

export interface OAuthClient {
  client_id: string
  client_name?: string
  redirect_uris?: string[]
  grant_types?: string[]
  scope?: string
  token_endpoint_auth_method?: string
}

/** OAuth2 client registry (Hydra admin proxy, X3). */
export const oauthClientsApi = {
  list: () => getCanonicalList<OAuthClient>("/api/admin/oauth-clients"),
  save: (editing: string | null, payload: Record<string, unknown>) =>
    editing
      ? putCanonical<OAuthClient>(
          `/api/admin/oauth-clients/${encodeURIComponent(editing)}`,
          payload
        )
      : postCanonical<OAuthClient>("/api/admin/oauth-clients", payload),
  remove: (clientId: string) =>
    deleteCanonical(`/api/admin/oauth-clients/${encodeURIComponent(clientId)}`),
}
