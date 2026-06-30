import { useEffect } from "react"
import { notificationsApi } from "./api"
import { useNotificationsStore } from "./store"
import type { NotificationItem, UnreadCountResponse } from "./types"

const STREAM_URL = "/api/notifications/stream"
const MAX_RECONNECT_DELAY_MS = 30_000

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

    const refreshUnreadCount = () => {
      notificationsApi
        .unreadCount()
        .then((res) =>
          useNotificationsStore.getState().setUnreadCount(res.count)
        )
        .catch(() => {})
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
        if (notification) {
          useNotificationsStore.getState().addNotification(notification)
        }
      })

      source.addEventListener("unread_count", (event) => {
        const payload = parseEventData<UnreadCountResponse>(event)
        if (payload) {
          useNotificationsStore.getState().setUnreadCount(payload.count)
        }
      })
    }

    connect()

    const handleOnline = () => {
      if (!source || source.readyState === EventSource.CLOSED) connect()
    }
    window.addEventListener("online", handleOnline)

    return () => {
      closed = true
      source?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
      window.removeEventListener("online", handleOnline)
      useNotificationsStore.getState().setConnected(false)
    }
  }, [enabled])
}

function parseEventData<T>(event: Event): T | undefined {
  const message = event as MessageEvent<string>
  try {
    return JSON.parse(message.data) as T
  } catch {
    return undefined
  }
}
