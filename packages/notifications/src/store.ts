import { create } from "zustand"
import type { NotificationItem } from "./types"

type NotificationsState = {
  notifications: NotificationItem[]
  unreadCount: number
  connected: boolean
  setNotifications: (notifications: NotificationItem[]) => void
  addNotification: (notification: NotificationItem) => void
  setUnreadCount: (count: number) => void
  setConnected: (connected: boolean) => void
  markRead: (id: string) => void
  markAllRead: () => void
  reset: () => void
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  notifications: [],
  unreadCount: 0,
  connected: false,
  setNotifications: (notifications) => set({ notifications }),
  addNotification: (notification) =>
    set((state) => {
      const withoutDuplicate = state.notifications.filter(
        (item) => item.id !== notification.id
      )
      return {
        notifications: [notification, ...withoutDuplicate].slice(0, 20),
        unreadCount: notification.readAt
          ? state.unreadCount
          : state.unreadCount + 1,
      }
    }),
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  setConnected: (connected) => set({ connected }),
  markRead: (id) =>
    set((state) => {
      const item = state.notifications.find((notification) => notification.id === id)
      if (!item || item.readAt) return state
      return {
        notifications: state.notifications.map((notification) =>
          notification.id === id
            ? { ...notification, readAt: new Date().toISOString() }
            : notification
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }
    }),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        readAt: notification.readAt ?? new Date().toISOString(),
      })),
      unreadCount: 0,
    })),
  reset: () => set({ notifications: [], unreadCount: 0, connected: false }),
}))
