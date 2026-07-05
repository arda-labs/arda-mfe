import { api } from "@workspace/api"
import type {
  NotificationListResponse,
  UnreadCountResponse,
} from "./types"

export const notificationsApi = {
  list: (limit = 20) =>
    api
      .get<NotificationListResponse>(`/api/notifications?limit=${limit}`)
      .then((res) => ({ notifications: res.items ?? [] })),
  unreadCount: () =>
    api.get<UnreadCountResponse>("/api/notifications/unread-count"),
  markRead: (id: string) =>
    api.post<{ ok: boolean }>(
      `/api/notifications/${encodeURIComponent(id)}/read`
    ),
  markAllRead: () =>
    api.post<{ ok: boolean }>("/api/notifications/read-all"),
}
