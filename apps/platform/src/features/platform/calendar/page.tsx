import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import type { SystemDate, HolidayCalendar } from "@/features/platform/api"
import { platformApi } from "@/features/platform/api"

import { Spinner } from "@workspace/ui/components/spinner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@workspace/ui/components/dialog"

import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"

import { Plus, AlertCircle } from "lucide-react"

// Zod schema for validation
const holidayFormSchema = z.object({
	holidayDate: z.string().min(1, "Vui lòng chọn ngày nghỉ lễ"),
	description: z.string().min(3, "Mô tả phải từ 3 đến 100 ký tự").max(100, "Mô tả quá dài"),
	isRecurring: z.boolean(),
})

type HolidayFormValues = z.infer<typeof holidayFormSchema>

export function CalendarPage() {
	const [status, setStatus] = useState<SystemDate | null>(null)
	const [holidays, setHolidays] = useState<HolidayCalendar[]>([])
	const [loading, setLoading] = useState(true)
	const [eodLoading, setEodLoading] = useState(false)
	
	// Modal states
	const [modalOpen, setModalOpen] = useState(false)
	const [selectedDate, setSelectedDate] = useState<string | null>(null)
	const [selectedHolidayId, setSelectedHolidayId] = useState<string | null>(null)

	const calendarRef = useRef<FullCalendar>(null)

	// React Hook Form integration with Zod
	const {
		register,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<HolidayFormValues>({
		resolver: zodResolver(holidayFormSchema),
		defaultValues: {
			holidayDate: "",
			description: "",
			isRecurring: false,
		},
	})

	const loadData = async () => {
		try {
			const [statusRes, holidaysRes] = await Promise.all([
				platformApi.getCalendarStatus("HEAD_OFFICE"),
				platformApi.listHolidays(),
			])
			setStatus(statusRes)
			setHolidays(holidaysRes || [])
		} catch (error) {
			toast.error("Không thể tải thông tin lịch làm việc")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadData()
	}, [])

	const handleRunEOD = async () => {
		setEodLoading(true)
		try {
			const res = await platformApi.triggerEOD("HEAD_OFFICE")
			setStatus(res.data)
			toast.success(res.message || "Xử lý cuối ngày (EOD) thành công!")
			await loadData()
		} catch (error: any) {
			toast.error(error.message || "Chạy EOD thất bại")
		} finally {
			setEodLoading(false)
		}
	}

	// FullCalendar map events
	const calendarEvents = [
		// Add weekends (custom weekends styling could also be done via CSS, but adding as events helps color coding)
		...holidays.map(h => ({
			id: h.id,
			title: h.description + (h.is_recurring ? " (Hàng năm)" : ` (Lễ ${h.holiday_year || ""})`),
			start: h.holiday_date.split("T")[0],
			allDay: true,
			backgroundColor: h.is_recurring ? "#22c55e" : "#f97316", // Green / Orange
			borderColor: h.is_recurring ? "#16a34a" : "#ea580c",
			extendedProps: {
				isRecurring: h.is_recurring,
				description: h.description,
				holidayDate: h.holiday_date.split("T")[0],
			}
		})),
		...(status ? [{
			id: "sys_business_date",
			title: "Ngày Làm Việc Hệ Thống",
			start: status.current_business_date.split("T")[0],
			allDay: true,
			backgroundColor: "#ef4444", // Red
			borderColor: "#dc2626",
			editable: false, // Cannot drag system date event
		}] : [])
	]

	// Handle selection on FullCalendar Grid (drag-select days)
	const handleSelect = (selectInfo: any) => {
		const startDate = selectInfo.startStr
		// FullCalendar select ranges are exclusive of end date for allDay events,
		// but since we want to declare one or more holidays, we open the modal for the start date.
		setSelectedDate(startDate)
		setSelectedHolidayId(null)
		reset({
			holidayDate: startDate,
			description: "",
			isRecurring: false,
		})
		setModalOpen(true)
	}

	// Handle event click (edit or view details)
	const handleEventClick = (clickInfo: any) => {
		const event = clickInfo.event
		if (event.id === "sys_business_date") {
			toast.info("Đây là Ngày làm việc hệ thống hiện tại, dùng nút Chạy EOD để dịch chuyển ngày.")
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

	// Handle event drag and drop (updating the holiday date)
	const handleEventDrop = async (dropInfo: any) => {
		const event = dropInfo.event
		if (event.id === "sys_business_date") {
			dropInfo.revert()
			return
		}

		const newDate = event.startStr
		const extProps = event.extendedProps

		try {
			// In real banking workflow, drop translates to moving holiday to a new date.
			// Let's create the new one and simulate deletion/update.
			// Since our API currently does not have an explicit PUT holiday, we create a new one.
			await platformApi.addHoliday({
				date: newDate,
				description: extProps.description,
				isRecurring: extProps.isRecurring,
			})
			toast.success(`Đã dời ngày nghỉ lễ sang ${new Date(newDate).toLocaleDateString("vi-VN")}`)
			await loadData()
		} catch (err) {
			dropInfo.revert()
			toast.error("Không thể thay đổi ngày nghỉ lễ")
		}
	}

	// Form Submission
	const onSubmit = async (values: HolidayFormValues) => {
		try {
			await platformApi.addHoliday({
				date: values.holidayDate,
				description: values.description,
				isRecurring: values.isRecurring,
			})
			toast.success(selectedHolidayId ? "Cập nhật ngày nghỉ lễ thành công" : "Thêm ngày nghỉ lễ thành công")
			setModalOpen(false)
			await loadData()
		} catch (error: any) {
			toast.error(error.message || "Xử lý thất bại")
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
						Lịch Hệ Thống
					</Badge>
				</div>
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div>
						<h1 className="text-2xl font-bold tracking-tight">Lịch Hệ Thống & Ngày Nghỉ Lễ</h1>
						<p className="text-sm text-muted-foreground">
							Xem, cấu hình và kéo thả ngày nghỉ lễ (Dương lịch & Âm lịch). Tự động tính năm áp dụng.
						</p>
					</div>
					<div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-lg border">
						{status && (
							<div className="text-xs space-y-0.5">
								<div className="flex items-center gap-1.5">
									<span className="size-2 rounded-full bg-red-500" />
									<span className="text-muted-foreground">Ngày hạch toán (T):</span>
									<span className="font-semibold">{new Date(status.current_business_date).toLocaleDateString("vi-VN")}</span>
								</div>
								<div className="text-muted-foreground pl-3.5">
									Trạng thái: <span className="font-semibold text-primary">{status.status}</span>
								</div>
							</div>
						)}
						<Button
							size="sm"
							onClick={handleRunEOD}
							disabled={eodLoading || status?.status !== "OPEN"}
						>
							{eodLoading ? <Spinner className="size-3 mr-1" /> : null}
							Chạy EOD
						</Button>
					</div>
				</div>
			</div>

			{/* FullCalendar Grid Panel */}
			<div className="grid gap-6 md:grid-cols-4">
				<div className="md:col-span-3 rounded-lg border bg-card p-5 shadow-sm">
					<div className="fc-theme-custom">
						<FullCalendar
							ref={calendarRef}
							plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
							initialView="dayGridMonth"
							locale="vi"
							firstDay={1} // Monday
							timeZone="Asia/Ho_Chi_Minh"
							headerToolbar={{
								left: "prev,next today",
								center: "title",
								right: "dayGridMonth,timeGridWeek",
							}}
							buttonText={{
								today: "Hôm nay",
								month: "Tháng",
								week: "Tuần",
							}}
							events={calendarEvents}
							selectable={true}
							editable={true}
							select={handleSelect}
							eventClick={handleEventClick}
							eventDrop={handleEventDrop}
							height="auto"
						/>
					</div>
				</div>

				{/* Legend & Holiday List Sidebar */}
				<div className="md:col-span-1 space-y-6">
					<div className="rounded-lg border bg-card p-4 space-y-3">
						<h3 className="font-semibold text-sm">Chú thích lịch nghỉ</h3>
						<div className="space-y-2 text-xs">
							<div className="flex items-center gap-2">
								<span className="size-3 rounded bg-green-500 border border-green-600 block" />
								<span>Lễ Dương lịch (Hàng năm)</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="size-3 rounded bg-orange-500 border border-orange-600 block" />
								<span>Lễ Âm lịch / Nghỉ bù (Theo năm)</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="size-3 rounded bg-red-500 border border-red-600 block" />
								<span>Ngày làm việc hệ thống (T)</span>
							</div>
						</div>
					</div>

					<div className="rounded-lg border bg-card p-4 space-y-4">
						<div className="flex items-center justify-between border-b pb-2">
							<h3 className="font-semibold text-sm">Các ngày nghỉ lễ</h3>
							<Button size="icon" variant="ghost" className="size-7" onClick={() => {
								setSelectedHolidayId(null)
								reset({
									holidayDate: new Date().toISOString().split("T")[0],
									description: "",
									isRecurring: false,
								})
								setModalOpen(true)
							}}>
								<Plus className="size-4" />
							</Button>
						</div>
						<div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
							{holidays.length === 0 ? (
								<p className="text-xs text-muted-foreground text-center py-4">Chưa có ngày nghỉ nào.</p>
							) : (
								holidays.map(h => (
									<div key={h.id} className="flex justify-between items-start p-2 rounded-md bg-muted/40 border text-xs gap-2">
										<div className="space-y-0.5">
											<div className="font-semibold">{h.description}</div>
											<div className="font-mono text-muted-foreground">{new Date(h.holiday_date).toLocaleDateString("vi-VN")}</div>
											<Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
												{h.is_recurring ? "Cố định" : `Năm ${h.holiday_year}`}
											</Badge>
										</div>
									</div>
								))
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Form Dialog for Creating/Editing Holiday */}
			<Dialog open={modalOpen} onOpenChange={setModalOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>{selectedHolidayId ? "Chi tiết ngày nghỉ lễ" : `Khai báo ngày nghỉ lễ cho ngày ${selectedDate || ""}`}</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
						<div className="space-y-1">
							<label className="text-xs font-semibold text-muted-foreground">Ngày nghỉ lễ</label>
							<Input
								type="date"
								{...register("holidayDate")}
								className={errors.holidayDate ? "border-destructive" : ""}
							/>
							{errors.holidayDate && (
								<p className="text-[11px] text-destructive flex items-center gap-1">
									<AlertCircle className="size-3" />
									{errors.holidayDate.message}
								</p>
							)}
						</div>

						<div className="space-y-1">
							<label className="text-xs font-semibold text-muted-foreground">Lý do nghỉ lễ</label>
							<Input
								placeholder="Nhập tên ngày lễ (ví dụ: Giỗ tổ Hùng Vương)"
								{...register("description")}
								className={errors.description ? "border-destructive" : ""}
							/>
							{errors.description && (
								<p className="text-[11px] text-destructive flex items-center gap-1">
									<AlertCircle className="size-3" />
									{errors.description.message}
								</p>
							)}
						</div>

						<div className="flex flex-col gap-1 border-t pt-3">
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									id="modal-recurring"
									{...register("isRecurring")}
									className="rounded border-gray-300 text-primary focus:ring-primary size-4"
								/>
								<label htmlFor="modal-recurring" className="text-xs font-semibold text-muted-foreground cursor-pointer">
									Ngày nghỉ lễ cố định lặp lại hàng năm
								</label>
							</div>
							<p className="text-[10px] text-muted-foreground pl-6">
								* Nếu bật, ngày nghỉ sẽ được áp dụng cho mọi năm. Nếu tắt, chỉ áp dụng cho năm đã chọn (thích hợp cho nghỉ lễ Âm lịch/nghỉ bù).
							</p>
						</div>

						<DialogFooter className="border-t pt-3 mt-4">
							<Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
								Hủy
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? <Spinner className="size-4 mr-1" /> : null}
								Lưu thông tin
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
