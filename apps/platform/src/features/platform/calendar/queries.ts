import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "@/features/platform/api"

export const calendarKeys = {
  all: ["platform", "calendar"] as const,
  status: (branchCode = "HEAD_OFFICE") => [...calendarKeys.all, "status", branchCode] as const,
  holidays: () => [...calendarKeys.all, "holidays"] as const,
  evaluate: (channel: string, type: string, time?: string) =>
    [...calendarKeys.all, "evaluate", channel, type, time] as const,
}

export function useCalendarStatus(branchCode = "HEAD_OFFICE") {
  return useQuery({
    queryKey: calendarKeys.status(branchCode),
    queryFn: () => platformApi.getCalendarStatus(branchCode),
  })
}

export function useHolidays() {
  return useQuery({
    queryKey: calendarKeys.holidays(),
    queryFn: () => platformApi.listHolidays(),
  })
}

export function useTriggerEOD(branchCode = "HEAD_OFFICE") {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => platformApi.triggerEOD(branchCode),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
      notify.success(result.message || "Xu ly cuoi ngay (EOD) thanh cong")
    },
    onError: (error) => {
      notify.error("Chay EOD that bai", translateApiError(error))
    },
  })
}

export function useAddHoliday() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { date: string; description: string; isRecurring: boolean }) => platformApi.addHoliday(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: calendarKeys.all })
    },
  })
}

export function useEvaluateDate() {
  return useMutation({
    mutationFn: ({ channel, type, time }: { channel: string; type: string; time?: string }) =>
      platformApi.evaluateDate(channel, type, time),
    onError: (error) => {
      notify.error("Kiem tra hach toan that bai", translateApiError(error))
    },
  })
}
