/**
 * Wire/view types for the business calendar + cut-off screens.
 * Wire source: arda-be/apps/platform-service (calendar handlers).
 */
export interface SystemDate {
  id: string
  branch_code: string
  current_business_date: string
  previous_business_date: string
  next_business_date: string
  status: string
  last_eod_at?: string
  updated_at: string
}

export interface HolidayCalendar {
  id: string
  holiday_date: string
  description: string
  is_recurring: boolean
  holiday_year?: number
  created_at: string
}
