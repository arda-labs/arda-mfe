import { useEffect } from "react"
import { apiUrl } from "@workspace/api/url"
import { i18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { notificationsApi } from "./api"
import { maybeShowBrowserNotification } from "./browser-notification"
import { useNotificationsStore } from "./store"
import type { NotificationItem, UnreadCountResponse } from "./types"

const STREAM_LOCK_NAME = "arda-notification-sse-v1"
const STREAM_CHANNEL_NAME = "arda-notification-sse-events-v1"

export function useNotificationStream(enabled: boolean) {
  useEffect(() => {
    const store = useNotificationsStore.getState()
    if (!enabled || typeof window === "undefined") {
      store.reset()
      return
    }

    let closed = false
    let source: EventSource | undefined
    let lockRetryTimer: ReturnType<typeof setTimeout> | undefined
    let refreshTimer: ReturnType<typeof setTimeout> | undefined
    let hasConnectedOnce = false
    let inboxRefreshVersion = 0
    let unreadRefreshVersion = 0
    const toastedIds = new Set<string>()
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(STREAM_CHANNEL_NAME)
        : undefined

    const refreshUnreadCount = () => {
      const version = ++unreadRefreshVersion
      notificationsApi
        .unreadCount()
        .then((res) => {
          if (version === unreadRefreshVersion) {
            useNotificationsStore.getState().setUnreadCount(res.count)
          }
        })
        .catch(() => {})
    }

    const bootstrapInbox = (notifyNew = false) => {
      const version = ++inboxRefreshVersion
      notificationsApi
        .list(20)
        .then((res) => {
          if (version !== inboxRefreshVersion) return
          useNotificationsStore.getState().setNotifications(res.notifications)
          for (const item of res.notifications) {
            if (notifyNew && !toastedIds.has(item.id)) pushToast(item)
            toastedIds.add(item.id)
          }
        })
        .catch(() => {})
        .finally(refreshUnreadCount)
    }

    const connect = () => {
      source?.close()
      source = new EventSource(apiUrl("/api/notifications/stream"), {
        withCredentials: true,
      })

      source.onopen = () => {
        useNotificationsStore.getState().setConnected(true)
        if (hasConnectedOnce) bootstrapInbox(true)
        hasConnectedOnce = true
      }

      source.onerror = () => {
        useNotificationsStore.getState().setConnected(false)
        // Keep this EventSource alive: native reconnect sends its Last-Event-ID
        // header, allowing the server to replay missed inbox changes.
      }

      source.addEventListener("inbox_changed", () => {
        channel?.postMessage({ type: "inbox_changed" })
        if (refreshTimer) clearTimeout(refreshTimer)
        refreshTimer = setTimeout(() => bootstrapInbox(true), 150)
      })

      source.addEventListener("resolved", () => {
        channel?.postMessage({ type: "inbox_changed" })
        if (refreshTimer) clearTimeout(refreshTimer)
        refreshTimer = setTimeout(() => bootstrapInbox(true), 150)
      })

      source.addEventListener("unread_count", (event) => {
        const payload = parseEventData<UnreadCountResponse>(event)
        if (payload) {
          useNotificationsStore.getState().setUnreadCount(payload.count)
          channel?.postMessage({ type: "unread_count", count: payload.count })
        }
      })
    }

    const handleChannelMessage = (event: MessageEvent) => {
      if (event.data?.type === "inbox_changed") bootstrapInbox(false)
      if (event.data?.type === "unread_count") {
        useNotificationsStore
          .getState()
          .setUnreadCount(Number(event.data.count) || 0)
      }
    }
    channel?.addEventListener("message", handleChannelMessage)

    let releaseLock: (() => void) | undefined
    const holdLock = () =>
      new Promise<void>((resolve) => {
        releaseLock = resolve
      })

    const acquireStream = async () => {
      if (closed) return
      const locks =
        typeof navigator !== "undefined" ? navigator.locks : undefined
      if (!locks) {
        // Older browsers do not expose Web Locks. Preserve functionality there;
        // current supported browsers coordinate through the lock below.
        connect()
        return
      }
      try {
        let acquired = false
        const request = locks.request(
          STREAM_LOCK_NAME,
          { ifAvailable: true },
          async (lock) => {
            if (!lock || closed) return
            acquired = true
            connect()
            await holdLock()
          }
        )
        void request.catch(() => {})
        await Promise.race([
          request,
          new Promise((resolve) => setTimeout(resolve, 100)),
        ])
        if (!acquired && !closed) {
          lockRetryTimer = setTimeout(acquireStream, 2_000)
        }
      } catch {
        if (!closed) connect()
      }
    }

    bootstrapInbox()
    void acquireStream()

    const handleOnline = () => {
      if (!source || source.readyState === EventSource.CLOSED)
        void acquireStream()
      bootstrapInbox(true)
    }
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        bootstrapInbox(true)
      }
    }
    window.addEventListener("online", handleOnline)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      closed = true
      releaseLock?.()
      source?.close()
      if (lockRetryTimer) clearTimeout(lockRetryTimer)
      if (refreshTimer) clearTimeout(refreshTimer)
      channel?.removeEventListener("message", handleChannelMessage)
      channel?.close()
      window.removeEventListener("online", handleOnline)
      document.removeEventListener("visibilitychange", handleVisibility)
      useNotificationsStore.getState().setConnected(false)
    }
  }, [enabled])
}

function pushToast(notification: NotificationItem) {
  if (notification.readAt) return
  const title = resolveNotificationText(
    notification.titleKey,
    notification.title,
    notification.params
  )
  const body = resolveNotificationText(
    notification.bodyKey,
    notification.body,
    notification.params
  )
  if (!title && !body) return
  if (notification.type === "error" || (notification.priority ?? 0) >= 2) {
    notify.warning(title || i18n.t("notifications.title"), body || undefined)
  }
  // Web Push stays generic; detailed content is loaded from the authenticated inbox.
  maybeShowBrowserNotification(
    notification,
    title || i18n.t("notifications.title"),
    body || ""
  )
}

function resolveNotificationText(
  key: string | undefined,
  fallback: string | undefined,
  params?: NotificationItem["params"]
) {
  if (key) {
    return String(
      i18n.t(key, {
        ns: "notifications",
        ...(params ?? {}),
      })
    )
  }
  return fallback ?? ""
}

function parseEventData<T>(event: Event): T | undefined {
  const message = event as MessageEvent<string>
  try {
    return JSON.parse(message.data) as T
  } catch {
    return undefined
  }
}
