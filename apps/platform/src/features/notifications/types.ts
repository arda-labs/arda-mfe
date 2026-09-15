/**
 * Wire/view types for notification templates, senders, events and DLQ (X2).
 * Wire source: arda-be/apps/notification-service (templates/senders/events/dlq).
 */
export interface NotificationTemplate {
  id: string
  event_code: string
  channel: string
  locale: string
  subject: string
  body: string
  is_active: boolean
}

export interface NotificationSender {
  id: string
  channel: string
  host: string
  port: number
  username?: string
  has_password?: boolean
  from_address: string
  from_name?: string
  use_tls: boolean
  is_active: boolean
}

export interface NotificationEvent {
  code: string
  subject: string
  domain: string
  description: string
  has_template: boolean
}

export interface NotificationDLQEntry {
  outbox_id: string
  tenant_id: string
  subject: string
  event_code: string
  payload: Record<string, unknown>
  attempts: number
  last_error: string
  dead_lettered_at: string
  replayed_at?: string
}
