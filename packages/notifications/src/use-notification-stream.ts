import { useEffect } from "react"
import { i18n } from "@workspace/i18n"
import { notificationsApi } from "./api"
import { maybeShowBrowserNotification } from "./browser-notification"
import { notify } from "./notify"
import { useNotificationsStore } from "./store"
import type { NotificationItem, UnreadCountResponse } from "./types"

const STREAM_URL = "/api/notifications/stream"
const MAX_RECONNECT_DELAY_MS = 30_000
const UNREAD_POLL_MS = 15_000

export function useNotificationStream(enabled: boolean) {
  useEffect(() => {
    const store = useNotificationsStore.getState()
    if (!enabled || typeof window === "undefined") {
      store.reset()
      return
    }

    let closed = false
    let source: EventSource | undefined
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    let reconnectDelay = 1_000
    const toastedIds = new Set<string>()

    const refreshUnreadCount = () => {
      notificationsApi
        .unreadCount()
        .then((res) =>
          useNotificationsStore.getState().setUnreadCount(res.count)
        )
        .catch(() => {})
    }

    const bootstrapInbox = () => {
      notificationsApi
        .list(20)
        .then((res) => {
          useNotificationsStore
            .getState()
            .setNotifications(res.notifications)
          for (const item of res.notifications) {
            toastedIds.add(item.id)
          }
        })
        .catch(() => {})
      refreshUnreadCount()
    }

    const scheduleReconnect = () => {
      if (closed) return
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(connect, reconnectDelay)
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS)
    }

    const connect = () => {
      source?.close()
      source = new EventSource(STREAM_URL, { withCredentials: true })

      source.onopen = () => {
        reconnectDelay = 1_000
        useNotificationsStore.getState().setConnected(true)
        refreshUnreadCount()
      }

      source.onerror = () => {
        useNotificationsStore.getState().setConnected(false)
        source?.close()
        scheduleReconnect()
      }

      source.addEventListener("notification", (event) => {
        const notification = parseEventData<NotificationItem>(event)
        if (!notification) return
        useNotificationsStore.getState().addNotification(notification)
        if (!toastedIds.has(notification.id)) {
          toastedIds.add(notification.id)
          pushToast(notification)
        }
      })

      source.addEventListener("unread_count", (event) => {
        const payload = parseEventData<UnreadCountResponse>(event)
        if (payload) {
          useNotificationsStore.getState().setUnreadCount(payload.count)
        }
      })
    }

    bootstrapInbox()
    connect()

    const unreadPoll = window.setInterval(refreshUnreadCount, UNREAD_POLL_MS)

    const handleOnline = () => {
      if (!source || source.readyState === EventSource.CLOSED) connect()
      refreshUnreadCount()
    }
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        bootstrapInbox()
      }
    }
    window.addEventListener("online", handleOnline)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      closed = true
      source?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      window.clearInterval(unreadPoll)
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

  const toastFn =
    notification.type === "error"
      ? notify.error
      : notification.type === "warning"
        ? notify.warning
        : notification.type === "success"
          ? notify.success
          : notify.info

  toastFn(title || "Thông báo", body || undefined)
  maybeShowBrowserNotification(notification, title || "Thông báo", body || "")
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
