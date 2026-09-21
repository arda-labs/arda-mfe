import { deleteCanonical, getCanonical, postCanonical } from "@workspace/api"
import type {
  NotificationDLQEntry,
  NotificationEvent,
  NotificationSender,
  NotificationTemplate,
} from "./types"

export function listNotificationTemplates() {
  return getCanonical<{ items: NotificationTemplate[] }>(
    "/api/notifications/templates"
  ).then((res) => res.items)
}

export function upsertNotificationTemplate(
  body: Partial<NotificationTemplate>
) {
  return postCanonical<NotificationTemplate>(
    "/api/notifications/templates",
    body
  )
}

export function deleteNotificationTemplate(id: string) {
  return deleteCanonical<{ ok: boolean }>(
    `/api/notifications/templates/${encodeURIComponent(id)}`
  )
}

export function listNotificationSenders() {
  return getCanonical<{ items: NotificationSender[] }>(
    "/api/notifications/senders"
  ).then((res) => res.items)
}

export function upsertNotificationSender(
  body: Partial<NotificationSender> & { password?: string }
) {
  return postCanonical<NotificationSender>("/api/notifications/senders", body)
}

export function testSendNotification(body: {
  event_code: string
  recipient: string
  locale?: string
  params?: Record<string, unknown>
}) {
  return postCanonical<{ ok: boolean }>("/api/notifications/test-send", body)
}

export function listNotificationEvents() {
  return getCanonical<{ items: NotificationEvent[] }>(
    "/api/notifications/events"
  ).then((res) => res.items)
}

export function listNotificationDLQ(limit = 100) {
  return getCanonical<{ items: NotificationDLQEntry[] }>(
    `/api/notifications/dlq?limit=${limit}`
  ).then((res) => res.items)
}

export function retryNotificationDLQ(id: string) {
  return postCanonical<{ ok: boolean }>(
    `/api/notifications/dlq/${encodeURIComponent(id)}/retry`,
    {}
  )
}

export function discardNotificationDLQ(id: string) {
  return deleteCanonical<{ ok: boolean }>(
    `/api/notifications/dlq/${encodeURIComponent(id)}`
  )
}
