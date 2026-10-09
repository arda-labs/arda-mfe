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
  entityType?: string
  entityId?: string
  resolvedAt?: string | null
  resolvedReason?: string
  supersededAt?: string | null
  expiresAt?: string | null
  locale?: string
  priority?: number
  eventSeq?: number
}

export type NotificationPreference = {
  eventGroup: string
  channel: "email" | "push" | "in_app" | "sms"
  enabled: boolean
  quietStart?: string | null
  quietEnd?: string | null
  timezone: string
  digestMode: "NONE" | "HOURLY" | "DAILY"
  locale: string
}

export type NotificationListResponse = {
  items: NotificationItem[]
}

export type UnreadCountResponse = {
  count: number
}
