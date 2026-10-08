import { getCanonical, postCanonical } from "@workspace/api"
import { buildSearchParams } from "@workspace/api/query"
import type { HolidayCalendar, SystemDate } from "./types"

export const calendarApi = {
  getCalendarStatus: (branchCode?: string) =>
    getCanonical<SystemDate>(
      `/api/platform/calendar/status?branchCode=${branchCode || "HEAD_OFFICE"}`
    ),
  triggerEOD: (branchCode?: string, businessDate?: string) =>
    postCanonical<{ message: string; data: SystemDate }>(
      `/api/platform/calendar/eod?${buildSearchParams({ branchCode: branchCode || "HEAD_OFFICE", business_date: businessDate }).toString()}`
    ),
  evaluateDate: (channel: string, type: string, time?: string) => {
    const p = buildSearchParams({ channel, type, time })
    return getCanonical<{
      channel: string
      type: string
      executionTime: string
      accountingDate: string
    }>(`/api/platform/calendar/evaluate?${p.toString()}`)
  },
  listHolidays: () =>
    getCanonical<HolidayCalendar[]>("/api/platform/calendar/holidays"),
  addHoliday: (data: {
    date: string
    description: string
    isRecurring: boolean
  }) => postCanonical<HolidayCalendar>("/api/platform/calendar/holidays", data),
}
