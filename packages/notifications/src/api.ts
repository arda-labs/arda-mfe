import { api, type ApiSuccess } from "@workspace/api"
import type { NotificationListResponse, UnreadCountResponse } from "./types"

export const notificationsApi = {
  // Background traffic (bootstrap + 15s unread poll): a 401 here must not
  // trigger the global logout/redirect — a live chat would be aborted and the
  // user dropped mid-answer (2026-09-16 incident). User-initiated actions
  // still surface the expired session.
  list: (limit = 20) =>
    api
      .get<ApiSuccess<NotificationListResponse>>(
        `/api/notifications?limit=${limit}`,
        { skipAuthFailureRedirect: true }
      )
      .then((res) => ({ notifications: res.result.items ?? [] })),
  unreadCount: () =>
    api
      .get<ApiSuccess<UnreadCountResponse>>("/api/notifications/unread-count", {
        skipAuthFailureRedirect: true,
      })
      .then((res) => res.result),
  markRead: (id: string) =>
    api
      .post<ApiSuccess<{ ok: boolean }>>(
        `/api/notifications/${encodeURIComponent(id)}/read`
      )
      .then((res) => res.result),
  markAllRead: () =>
    api
      .post<ApiSuccess<{ ok: boolean }>>("/api/notifications/read-all")
      .then((res) => res.result),
  pushPublicKey: () =>
    api
      .get<ApiSuccess<{ publicKey: string }>>(
        "/api/notifications/push/vapid-public-key"
      )
      .then((res) => res.result),
  subscribePush: (input: {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }) =>
    api
      .post<ApiSuccess<{ ok: boolean }>>(
        "/api/notifications/push/subscribe",
        input
      )
      .then((res) => res.result),
  unsubscribePush: (endpoint: string) =>
    api
      .post<ApiSuccess<{ ok: boolean }>>(
        "/api/notifications/push/unsubscribe",
        { endpoint }
      )
      .then((res) => res.result),
}
