export type NotificationKind = "info" | "warning" | "success" | "error"

export type NotificationItem = {
  id: string
  type: NotificationKind
  title?: string
  titleKey?: string
  body?: string
  bodyKey?: string
  params?: Record<string, string | number>
  href?: string
  readAt?: string | null
  createdAt: string
}

export type NotificationListResponse = {
  notifications: NotificationItem[]
}

export type UnreadCountResponse = {
  count: number
}
