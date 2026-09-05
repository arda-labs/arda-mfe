import { useCallback, useEffect, useState } from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Gauge,
  Wallet,
} from "lucide-react"
import { fetchQuotas, saveQuotas, type DepartmentBudgetDTO } from "../api"

export function BudgetQuotasTab() {
  const [budgets, setBudgets] = useState<DepartmentBudgetDTO[]>([])
  const [webhookUrl, setWebhookUrl] = useState("")
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState(0)
  const [tokensUsed, setTokensUsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadQuotas = useCallback(async () => {
    try {
      const data = await fetchQuotas()
      if (data) {
        setBudgets(data.budgets ?? [])
        setWebhookUrl(data.webhookUrl ?? "")
        setMonthlyTokenLimit(data.monthlyTokenLimit ?? 0)
        setTokensUsed(data.tokensUsed ?? 0)
      }
    } catch {
      // The empty state below explains that quota is not configured.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadQuotas()
  }, [loadQuotas])

  const updateLimit = (department: string, newLimit: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.department === department ? { ...b, monthlyLimit: newLimit } : b))
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveQuotas({
        budgets,
        webhookUrl,
        monthlyTokenLimit,
      })
      notify.success("Đã lưu hạn mức ngân sách và giới hạn tốc độ (Rate Limits)!")
    } catch (err) {
      notify.error("Không thể lưu cấu hình hạn mức", err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="shadow-xs lg:col-span-8">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Hạn mức Ngân sách theo Phòng ban (Monthly Department Budgets)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Thiết lập ngân sách trần (Hard Cap) bằng USD cho từng bộ phận để ngăn ngừa rủi ro vượt ngưỡng chi phí
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            <div className="space-y-3">
              {!loading && budgets.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-muted-foreground">
                  Chưa có hạn mức phòng ban nào được cấu hình.
                </p>
              )}
              {budgets.map((b) => {
                const percent = b.monthlyLimit > 0 ? Math.min(Math.round((b.spent / b.monthlyLimit) * 100), 100) : 0
                const isWarning = percent >= 80

                return (
                  <div key={b.department} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{b.department}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-muted-foreground">
                          ${b.spent.toFixed(2)} /
                        </span>
                        <div className="flex items-center gap-1 font-mono font-semibold text-primary">
                          $
                          <Input
                            type="number"
                            className="h-7 w-20 px-2 font-mono text-xs"
                            value={b.monthlyLimit}
                            onChange={(e) => updateLimit(b.department, Number(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>Đã sử dụng trong kỳ</span>
                        <span className={`font-mono font-medium ${isWarning ? "text-amber-600 font-bold" : ""}`}>
                          {percent}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${
                            percent >= 90
                              ? "bg-destructive"
                              : percent >= 75
                              ? "bg-amber-500"
                              : "bg-primary"
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={handleSave}>
                Lưu Hạn mức Ngân sách
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs lg:col-span-4">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                Giới hạn Tốc độ (Rate Limiting)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Chống nghẽn hạ tầng và lạm dụng API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0 text-xs">
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <span className="font-semibold text-foreground">Hạn ngạch Toàn hệ thống (Global Limits)</span>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded border bg-card p-2 text-center">
                  <div className="text-[10px] text-muted-foreground">Max RPM</div>
                  <div className="font-mono text-sm font-bold text-primary">—</div>
                  <div className="text-[9px] text-muted-foreground">req / phút</div>
                </div>
                <div className="rounded border bg-card p-2 text-center">
                  <div className="text-[10px] text-muted-foreground">Max TPM</div>
                  <div className="font-mono text-sm font-bold text-primary">—</div>
                  <div className="text-[9px] text-muted-foreground">token / phút</div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-medium text-foreground">Hạn mức token theo tháng (0 = không giới hạn)</label>
              <Input
                type="number"
                min={0}
                className="h-8 text-xs font-mono"
                value={monthlyTokenLimit}
                onChange={(e) => setMonthlyTokenLimit(Math.max(0, Number(e.target.value) || 0))}
              />
              {monthlyTokenLimit > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Đã dùng {tokensUsed.toLocaleString()} / {monthlyTokenLimit.toLocaleString()} token trong kỳ hiện tại.
                </p>
              )}
              <label className="font-medium text-foreground">Webhook Cảnh báo khi chạm 80% hạn mức</label>
              <Input
                className="h-8 text-xs font-mono"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/..."
              />
              <p className="text-[10px] text-muted-foreground">
                Gửi thông báo tức thời qua Slack hoặc Microsoft Teams khi một phòng ban sắp hết ngân sách AI.
              </p>
            </div>

            <div className="flex justify-end pt-3">
              <Button size="sm" className="text-xs" disabled={saving} onClick={handleSave}>
                {saving ? "Đang lưu..." : "Lưu Hạn mức & Ngân sách"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
