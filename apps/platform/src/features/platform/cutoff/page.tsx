import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import type { SystemDate } from "@/features/platform/api"
import { platformApi } from "@/features/platform/api"
import { Spinner } from "@workspace/ui/components/spinner"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Clock, SlidersHorizontal, CheckCircle2, AlertTriangle } from "lucide-react"

interface CutoffDisplay {
	id: string
	channelCode: string
	transactionType: string
	cutoffTime: string
	isActive: boolean
}

export function CutoffPage() {
	const [status, setStatus] = useState<SystemDate | null>(null)
	const [loading, setLoading] = useState(true)

	// Simulator states
	const [simChannel, setSimChannel] = useState("CITAD")
	const [simType, setSimType] = useState("TRANSFER")
	const [simTime, setSimTime] = useState("")
	const [simResult, setSimResult] = useState<string | null>(null)
	const [simLoading, setSimLoading] = useState(false)

	const loadData = async () => {
		try {
			const statusRes = await platformApi.getCalendarStatus("HEAD_OFFICE")
			setStatus(statusRes)
		} catch (error) {
			toast.error("Không thể tải thông tin ngày hệ thống")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadData()
	}, [])

	const handleSimulate = async () => {
		setSimLoading(true)
		setSimResult(null)
		try {
			let timeParam = undefined
			if (simTime) {
				const today = new Date().toISOString().split("T")[0]
				timeParam = new Date(`${today}T${simTime}:00Z`).toISOString()
			}
			const res = await platformApi.evaluateDate(simChannel, simType, timeParam)
			setSimResult(res.accountingDate)
		} catch (error: any) {
			toast.error("Kiểm tra hạch toán thất bại")
		} finally {
			setSimLoading(false)
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
						Quản lý Cut-off
					</Badge>
				</div>
				<h1 className="text-2xl font-bold tracking-tight">Cấu Hình Giờ Chốt Sổ (Cut-off Time)</h1>
				<p className="text-sm text-muted-foreground">
					Thiết lập thời gian chốt giao dịch trong ngày cho các kênh thanh toán, chuyển tiền liên ngân hàng và giả lập ngày hạch toán.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-3">
				{/* 1. Cut-off list */}
				<div className="rounded-lg border bg-card p-5 space-y-4 md:col-span-2">
					<h2 className="font-semibold text-lg flex items-center gap-2 border-b pb-3">
						<Clock className="size-5 text-primary" />
						Giờ Chốt Sổ Theo Kênh Thanh Toán (Platform)
					</h2>

					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead className="border-b bg-muted/50">
								<tr>
									<th className="p-3 text-left font-medium">Kênh</th>
									<th className="p-3 text-left font-medium">Loại giao dịch</th>
									<th className="p-3 text-left font-medium">Giờ chốt sổ</th>
									<th className="p-3 text-center font-medium">Trạng thái</th>
								</tr>
							</thead>
							<tbody>
								{([
									{ id: "1", channelCode: "CITAD", transactionType: "TRANSFER", cutoffTime: "16:30:00", isActive: true },
									{ id: "2", channelCode: "NAPAS", transactionType: "TRANSFER", cutoffTime: "17:00:00", isActive: true },
									{ id: "3", channelCode: "COUNTER", transactionType: "DEPOSIT", cutoffTime: "17:00:00", isActive: true },
								] as CutoffDisplay[]).map((c) => (
									<tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
										<td className="p-3 font-semibold text-primary">{c.channelCode}</td>
										<td className="p-3 text-muted-foreground">{c.transactionType}</td>
										<td className="p-3 font-mono font-medium text-destructive">{c.cutoffTime}</td>
										<td className="p-3 text-center">
											<Badge variant="default" className="bg-green-500 hover:bg-green-600">
												Hoạt động
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<p className="text-xs text-muted-foreground mt-2">
						* Lưu ý: Giao dịch phát sinh sau giờ chốt sổ sẽ được chuyển tiếp hạch toán và đối soát vào ngày làm việc tiếp theo (T+1).
					</p>
				</div>

				{/* 2. Simulator */}
				<div className="rounded-lg border bg-card p-5 space-y-4 md:col-span-1">
					<h2 className="font-semibold text-lg flex items-center gap-2 border-b pb-3">
						<SlidersHorizontal className="size-5 text-primary" />
						Giả Lập Ngày Hạch Toán
					</h2>

					<div className="space-y-3">
						<div>
							<label className="text-xs font-medium text-muted-foreground">Kênh giao dịch</label>
							<select
								value={simChannel}
								onChange={(e) => setSimChannel(e.target.value)}
								className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<option value="CITAD">CITAD (Chốt: 16:30)</option>
								<option value="NAPAS">NAPAS (Chốt: 17:00)</option>
								<option value="COUNTER">Tại Quầy (Chốt: 17:00)</option>
							</select>
						</div>

						<div>
							<label className="text-xs font-medium text-muted-foreground">Loại giao dịch</label>
							<select
								value={simType}
								onChange={(e) => setSimType(e.target.value)}
								className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
							>
								<option value="TRANSFER">TRANSFER (Chuyển khoản)</option>
								<option value="DEPOSIT">DEPOSIT (Nộp tiền)</option>
							</select>
						</div>

						<div>
							<label className="text-xs font-medium text-muted-foreground">
								Giờ giao dịch giả lập (để trống nếu lấy Giờ hiện tại)
							</label>
							<Input
								type="time"
								value={simTime}
								onChange={(e) => setSimTime(e.target.value)}
								className="mt-1"
							/>
						</div>

						<Button onClick={handleSimulate} className="w-full mt-2" variant="outline" disabled={simLoading}>
							{simLoading ? <Spinner className="size-4" /> : "Kiểm tra Ngày Hạch Toán"}
						</Button>

						{simResult && (
							<div className="mt-4 p-3 bg-muted/50 rounded-md border text-sm space-y-2">
								<div className="flex justify-between items-center">
									<span className="text-muted-foreground">Ngày hạch toán:</span>
									<span className="font-semibold text-primary">{new Date(simResult).toLocaleDateString("vi-VN")}</span>
								</div>
								<div className="border-t pt-2 mt-1">
									{status && simResult === status.next_business_date.split("T")[0] ? (
										<div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold">
											<AlertTriangle className="size-4 shrink-0" />
											<span>Quá giờ Cut-off. Hạch toán T+1!</span>
										</div>
									) : (
										<div className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
											<CheckCircle2 className="size-4 shrink-0" />
											<span>Hợp lệ. Hạch toán trong ngày T!</span>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}
