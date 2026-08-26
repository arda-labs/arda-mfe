import { useCallback, useEffect, useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { platformApi, type HolidayCalendar, type SystemDate } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import timeGridPlugin from "@fullcalendar/timegrid"
import { Plus } from "lucide-react"

const holidayFormSchema = z.object({
  holidayDate: z.string().trim().min(1, "Ngay nghi le la bat buoc"),
  description: z
    .string()
    .trim()
    .min(3, "Mo ta phai co it nhat 3 ky tu")
    .max(100, "Mo ta qua dai"),
  isRecurring: z.boolean(),
})

type HolidayFormValues = z.infer<typeof holidayFormSchema>

const holidayDefaultValues: HolidayFormValues = {
  holidayDate: "",
  description: "",
  isRecurring: false,
}

export function CalendarPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedHolidayId, setSelectedHolidayId] = useState<string | null>(
    null
  )
  const [status, setStatus] = useState<SystemDate | null>(null)
  const [holidays, setHolidays] = useState<HolidayCalendar[]>([])
  const [loading, setLoading] = useState(true)
  const [eodPending, setEodPending] = useState(false)
  const [addHolidayPending, setAddHolidayPending] = useState(false)
  const calendarRef = useRef<FullCalendar>(null)

  const loadCalendar = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    try {
      const [statusResult, holidaysResult] = await Promise.all([
        platformApi.getCalendarStatus("HEAD_OFFICE"),
        platformApi.listHolidays(),
      ])
      setStatus(statusResult)
      setHolidays(holidaysResult)
    } catch (err) {
      notify.error(
        "Khong the tai thong tin lich lam viec",
        translateApiError(err)
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCalendar(true)
  }, [loadCalendar])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<HolidayFormValues>({
    resolver: zodResolver(holidayFormSchema),
    defaultValues: holidayDefaultValues,
  })

  const handleRunEOD = async () => {
    setEodPending(true)
    try {
      const result = await platformApi.triggerEOD("HEAD_OFFICE")
      notify.success(result.message || "Xu ly cuoi ngay (EOD) thanh cong")
      await loadCalendar()
    } catch (err) {
      notify.error("Chay EOD that bai", translateApiError(err))
    } finally {
      setEodPending(false)
    }
  }

  const openCreateHoliday = (date: string) => {
    setSelectedDate(date)
    setSelectedHolidayId(null)
    reset({
      holidayDate: date,
      description: "",
      isRecurring: false,
    })
    setModalOpen(true)
  }

  const calendarEvents = [
    ...holidays.map((holiday) => ({
      id: holiday.id,
      title:
        holiday.description +
        (holiday.is_recurring
          ? " (Hang nam)"
          : ` (Le ${holiday.holiday_year || ""})`),
      start: holiday.holiday_date.split("T")[0],
      allDay: true,
      backgroundColor: holiday.is_recurring ? "#22c55e" : "#f97316",
      borderColor: holiday.is_recurring ? "#16a34a" : "#ea580c",
      extendedProps: {
        isRecurring: holiday.is_recurring,
        description: holiday.description,
        holidayDate: holiday.holiday_date.split("T")[0],
      },
    })),
    ...(status
      ? [
          {
            id: "sys_business_date",
            title: "Ngay lam viec he thong",
            start: status.current_business_date.split("T")[0],
            allDay: true,
            backgroundColor: "#ef4444",
            borderColor: "#dc2626",
            editable: false,
          },
        ]
      : []),
  ]

  const handleSelect = (selectInfo: { startStr: string }) => {
    openCreateHoliday(selectInfo.startStr)
  }

  const handleEventClick = (clickInfo: any) => {
    const event = clickInfo.event
    if (event.id === "sys_business_date") {
      notify.info(
        "Day la ngay lam viec he thong hien tai, dung nut Chay EOD de dich chuyen ngay."
      )
      return
    }

    setSelectedHolidayId(event.id)
    const extProps = event.extendedProps
    reset({
      holidayDate: extProps.holidayDate,
      description: extProps.description,
      isRecurring: extProps.isRecurring,
    })
    setModalOpen(true)
  }

  const handleEventDrop = async (dropInfo: any) => {
    const event = dropInfo.event
    if (event.id === "sys_business_date") {
      dropInfo.revert()
      return
    }

    const newDate = event.startStr
    const extProps = event.extendedProps
    try {
      await platformApi.addHoliday({
        date: newDate,
        description: extProps.description,
        isRecurring: extProps.isRecurring,
      })
      notify.success(
        `Da doi ngay nghi le sang ${new Date(newDate).toLocaleDateString("vi-VN")}`
      )
      await loadCalendar()
    } catch (error) {
      dropInfo.revert()
      notify.error("Khong the thay doi ngay nghi le", translateApiError(error))
    }
  }

  const submitHoliday = handleSubmit(async (values) => {
    setAddHolidayPending(true)
    try {
      await platformApi.addHoliday({
        date: values.holidayDate,
        description: values.description.trim(),
        isRecurring: values.isRecurring,
      })
      notify.success(
        selectedHolidayId
          ? "Cap nhat ngay nghi le thanh cong"
          : "Them ngay nghi le thanh cong"
      )
      setModalOpen(false)
      reset(holidayDefaultValues)
      await loadCalendar()
    } catch (error) {
      notify.error("Xu ly that bai", translateApiError(error))
    } finally {
      setAddHolidayPending(false)
    }
  })

  const handleDialogOpenChange = (open: boolean) => {
    setModalOpen(open)
    if (!open) {
      setSelectedDate(null)
      setSelectedHolidayId(null)
      reset(holidayDefaultValues)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="px-2.5 py-1 text-xs">
            Lich he thong
          </Badge>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Lich he thong & ngay nghi le
            </h1>
            <p className="text-sm text-muted-foreground">
              Xem, cau hinh va keo tha ngay nghi le. Tu dong tinh nam ap dung.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-2.5">
            {status && (
              <div className="space-y-0.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-red-500" />
                  <span className="text-muted-foreground">
                    Ngay hach toan (T):
                  </span>
                  <span className="font-semibold">
                    {new Date(status.current_business_date).toLocaleDateString(
                      "vi-VN"
                    )}
                  </span>
                </div>
                <div className="pl-3.5 text-muted-foreground">
                  Trang thai:{" "}
                  <span className="font-semibold text-primary">
                    {status.status}
                  </span>
                </div>
              </div>
            )}
            <Button
              size="sm"
              onClick={handleRunEOD}
              disabled={eodPending || status?.status !== "OPEN"}
            >
              {eodPending ? <Spinner className="mr-1 size-3" /> : null}
              Chay EOD
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-5 shadow-sm md:col-span-3">
          <div className="fc-theme-custom">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="vi"
              firstDay={1}
              timeZone="Asia/Ho_Chi_Minh"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek",
              }}
              buttonText={{
                today: "Hom nay",
                month: "Thang",
                week: "Tuan",
              }}
              events={calendarEvents}
              selectable
              editable
              select={handleSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              height="auto"
            />
          </div>
        </div>

        <div className="space-y-6 md:col-span-1">
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <h3 className="text-sm font-semibold">Chu thich lich nghi</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="block size-3 rounded border border-green-600 bg-green-500" />
                <span>Le duong lich hang nam</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="block size-3 rounded border border-orange-600 bg-orange-500" />
                <span>Le theo nam</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="block size-3 rounded border border-red-600 bg-red-500" />
                <span>Ngay lam viec he thong (T)</span>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold">Cac ngay nghi le</h3>
              <Button
                size="icon"
                variant="ghost"
                className="size-7"
                onClick={() =>
                  openCreateHoliday(new Date().toISOString().split("T")[0])
                }
              >
                <Plus className="size-4" />
              </Button>
            </div>
            <div className="max-h-[300px] space-y-2.5 overflow-y-auto pr-1">
              {holidays.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Chua co ngay nghi nao.
                </p>
              ) : (
                holidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="flex items-start justify-between gap-2 rounded-md border bg-muted/40 p-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold">{holiday.description}</div>
                      <div className="font-mono text-muted-foreground">
                        {new Date(holiday.holiday_date).toLocaleDateString(
                          "vi-VN"
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="h-4 px-1 py-0 text-[10px]"
                      >
                        {holiday.is_recurring
                          ? "Co dinh"
                          : `Nam ${holiday.holiday_year}`}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={modalOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedHolidayId
                ? "Chi tiet ngay nghi le"
                : `Khai bao ngay nghi le ${selectedDate || ""}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={submitHoliday} className="space-y-4 pt-2">
            <FormField
              label="Ngay nghi le"
              htmlFor="holiday_date"
              error={errors.holidayDate?.message}
            >
              <Input
                id="holiday_date"
                type="date"
                aria-invalid={Boolean(errors.holidayDate)}
                {...register("holidayDate")}
              />
            </FormField>

            <FormField
              label="Ly do nghi le"
              htmlFor="holiday_description"
              error={errors.description?.message}
            >
              <Input
                id="holiday_description"
                placeholder="Nhap ten ngay le"
                aria-invalid={Boolean(errors.description)}
                {...register("description")}
              />
            </FormField>

            <Controller
              control={control}
              name="isRecurring"
              render={({ field }) => (
                <div className="flex flex-col gap-1 border-t pt-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="holiday_recurring"
                      checked={field.value}
                      onCheckedChange={(checked) =>
                        field.onChange(checked === true)
                      }
                    />
                    <label
                      htmlFor="holiday_recurring"
                      className="cursor-pointer text-xs font-semibold text-muted-foreground"
                    >
                      Ngay nghi le co dinh lap lai hang nam
                    </label>
                  </div>
                  <p className="pl-6 text-[10px] text-muted-foreground">
                    Neu bat, ngay nghi se ap dung cho moi nam. Neu tat, chi ap
                    dung cho nam da chon.
                  </p>
                </div>
              )}
            />

            <DialogFooter className="mt-4 border-t pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogOpenChange(false)}
              >
                Huy
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || addHolidayPending}
              >
                {isSubmitting ? <Spinner className="mr-1 size-4" /> : null}
                Luu thong tin
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
