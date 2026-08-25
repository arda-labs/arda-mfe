import { api, type ApiSuccess } from "@workspace/api"
import type { NotificationListResponse, UnreadCountResponse } from "./types"

export const notificationsApi = {
  list: (limit = 20) =>
    api
      .get<ApiSuccess<NotificationListResponse>>(
        `/api/notifications?limit=${limit}`
      )
      .then((res) => ({ notifications: res.result.items ?? [] })),
  unreadCount: () =>
    api
      .get<ApiSuccess<UnreadCountResponse>>("/api/notifications/unread-count")
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
