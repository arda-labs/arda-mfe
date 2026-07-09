import { create } from "zustand"
import type { NotificationItem, NotificationKind } from "./types"

export type InboxToast = {
  id: string
  notificationId: string
  type: NotificationKind
  title: string
  body?: string
  href?: string
  createdAt: number
}

type InboxToastState = {
  toasts: InboxToast[]
  push: (input: {
    notification: NotificationItem
    title: string
    body?: string
  }) => void
  dismiss: (id: string) => void
  clear: () => void
}

const MAX_TOASTS = 3

export const useInboxToastStore = create<InboxToastState>((set) => ({
  toasts: [],
  push: ({ notification, title, body }) =>
    set((state) => {
      if (
        state.toasts.some((toast) => toast.notificationId === notification.id)
      ) {
        return state
      }
      const next: InboxToast = {
        id: `toast_${notification.id}_${Date.now()}`,
        notificationId: notification.id,
        type: notification.type ?? "info",
        title,
        body: body || undefined,
        href: notification.href,
        createdAt: Date.now(),
      }
      return { toasts: [next, ...state.toasts].slice(0, MAX_TOASTS) }
    }),
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clear: () => set({ toasts: [] }),
}))
