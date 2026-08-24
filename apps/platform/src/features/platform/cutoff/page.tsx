import { useCallback, useEffect, useState } from "react"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  SlidersHorizontal,
} from "lucide-react"
import { platformApi, type SystemDate } from "../api"

interface CutoffDisplay {
  id: string
  channelCode: string
  transactionType: string
  cutoffTime: string
  isActive: boolean
}

const CUTOFFS: CutoffDisplay[] = [
  {
    id: "1",
    channelCode: "CITAD",
    transactionType: "TRANSFER",
    cutoffTime: "16:30:00",
    isActive: true,
  },
  {
    id: "2",
    channelCode: "NAPAS",
    transactionType: "TRANSFER",
    cutoffTime: "17:00:00",
    isActive: true,
  },
  {
    id: "3",
    channelCode: "COUNTER",
    transactionType: "DEPOSIT",
    cutoffTime: "17:00:00",
    isActive: true,
  },
]

export function CutoffPage() {
  const [simChannel, setSimChannel] = useState("CITAD")
  const [simType, setSimType] = useState("TRANSFER")
  const [simTime, setSimTime] = useState("")
  const [simResult, setSimResult] = useState<string | null>(null)
  const [status, setStatus] = useState<SystemDate | null>(null)
  const [loading, setLoading] = useState(true)
  const [simPending, setSimPending] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const result = await platformApi.getCalendarStatus("HEAD_OFFICE")
      setStatus(result)
    } catch (err) {
      notify.error(
        "Khong the tai thong tin ngay he thong",
        translateApiError(err)
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const handleSimulate = async () => {
    setSimResult(null)
    setSimPending(true)
    try {
      let timeParam: string | undefined
      if (simTime) {
        const today = new Date().toISOString().split("T")[0]
        timeParam = new Date(`${today}T${simTime}:00Z`).toISOString()
      }
      const res = await platformApi.evaluateDate(simChannel, simType, timeParam)
      setSimResult(res.accountingDate)
    } catch (err) {
      notify.error("Kiem tra hach toan that bai", translateApiError(err))
    } finally {
      setSimPending(false)
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
            Quan ly Cut-off
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Cau hinh gio chot so (Cut-off Time)
        </h1>
        <p className="text-sm text-muted-foreground">
          Thiet lap thoi gian chot giao dich trong ngay cho cac kenh thanh toan,
          chuyen tien lien ngan hang va gia lap ngay hach toan.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-4 rounded-lg border bg-card p-5 md:col-span-2">
          <h2 className="flex items-center gap-2 border-b pb-3 text-lg font-semibold">
            <Clock className="size-5 text-primary" />
            Gio chot so theo kenh thanh toan
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Kenh</th>
                  <th className="p-3 text-left font-medium">Loai giao dich</th>
                  <th className="p-3 text-left font-medium">Gio chot so</th>
                  <th className="p-3 text-center font-medium">Trang thai</th>
                </tr>
              </thead>
              <tbody>
                {CUTOFFS.map((cutoff) => (
                  <tr
                    key={cutoff.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    <td className="p-3 font-semibold text-primary">
                      {cutoff.channelCode}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {cutoff.transactionType}
                    </td>
                    <td className="p-3 font-mono font-medium text-destructive">
                      {cutoff.cutoffTime}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant="default"
                        className="bg-green-500 hover:bg-green-600"
                      >
                        Hoat dong
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            * Giao dich phat sinh sau gio chot so se duoc chuyen tiep hach toan
            va doi soat vao ngay lam viec tiep theo (T+1).
          </p>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-5 md:col-span-1">
          <h2 className="flex items-center gap-2 border-b pb-3 text-lg font-semibold">
            <SlidersHorizontal className="size-5 text-primary" />
            Gia lap ngay hach toan
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Kenh giao dich
              </label>
              <select
                value={simChannel}
                onChange={(event) => setSimChannel(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <option value="CITAD">CITAD (Chot: 16:30)</option>
                <option value="NAPAS">NAPAS (Chot: 17:00)</option>
                <option value="COUNTER">Tai quay (Chot: 17:00)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Loai giao dich
              </label>
              <select
                value={simType}
                onChange={(event) => setSimType(event.target.value)}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <option value="TRANSFER">TRANSFER (Chuyen khoan)</option>
                <option value="DEPOSIT">DEPOSIT (Nop tien)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Gio giao dich gia lap (de trong neu lay gio hien tai)
              </label>
              <Input
                type="time"
                value={simTime}
                onChange={(event) => setSimTime(event.target.value)}
                className="mt-1"
              />
            </div>

            <Button
              onClick={handleSimulate}
              className="mt-2 w-full"
              variant="outline"
              disabled={simPending}
            >
              {simPending ? (
                <Spinner className="size-4" />
              ) : (
                "Kiem tra ngay hach toan"
              )}
            </Button>

            {simResult && (
              <div className="mt-4 space-y-2 rounded-md border bg-muted/50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ngay hach toan:</span>
                  <span className="font-semibold text-primary">
                    {new Date(simResult).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="mt-1 border-t pt-2">
                  {status &&
                  simResult === status.next_business_date.split("T")[0] ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                      <AlertTriangle className="size-4 shrink-0" />
                      <span>Qua gio cut-off. Hach toan T+1.</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-green-600">
                      <CheckCircle2 className="size-4 shrink-0" />
                      <span>Hop le. Hach toan trong ngay T.</span>
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
