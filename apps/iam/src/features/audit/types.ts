export interface AuditEvent {
  id: string
  eventType: string
  subject: string
  action: string
  resource: string
  result: string
  details: Record<string, unknown>
  clientIp: string
  userAgent: string
  requestId: string
  serviceName: string
  timestamp: string
}

export type AuditEventApiItem = {
  id: string
  event_type: string
  subject: string
  action: string
  resource: string
  result: string
  details: Record<string, unknown>
  client_ip: string
  user_agent: string
  request_id: string
  service_name: string
  timestamp: string
}

export interface AuditStats {
  totalEvents: number
  byEventType: Record<string, number>
  byResult: Record<string, number>
  loginSuccess: number
  loginFailure: number
  from: string
  to: string
}

export interface ChainVerification {
  valid: boolean
  total: number
  tampered?: string[]
}
