/**
 * Wire/view types for working hours (ca làm việc, W6a).
 * Wire source: arda-be/apps/platform-service (working-hours handlers).
 */
export interface WorkingHour {
  id: string
  org_code?: string
  day_of_week: number
  start_time: string
  end_time: string
  break_minutes: number
  is_active: boolean
}
