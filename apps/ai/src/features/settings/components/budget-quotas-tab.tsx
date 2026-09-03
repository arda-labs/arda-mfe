import { useState } from "react"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  Gauge,
  Wallet,
} from "lucide-react"

interface DepartmentBudget {
  department: string
  monthlyLimit: number
  spent: number
  rpmLimit: number
}

const INITIAL_BUDGETS: DepartmentBudget[] = [
  { department: "Tech & DevOps", monthlyLimit: 300, spent: 118.2, rpmLimit: 120 },
  { department: "Sales & Marketing", monthlyLimit: 150, spent: 42.5, rpmLimit: 60 },
  { department: "HR & Internal Ops", monthlyLimit: 80, spent: 15.4, rpmLimit: 30 },
  { department: "Finance & Accounting", monthlyLimit: 100, spent: 22.1, rpmLimit: 40 },
]

export function BudgetQuotasTab() {
  const [budgets, setBudgets] = useState<DepartmentBudget[]>(INITIAL_BUDGETS)
  const [webhookUrl, setWebhookUrl] = useState("https://hooks.slack.com/services/T00/B00/XXXX")

  const updateLimit = (department: string, newLimit: number) => {
    setBudgets((prev) =>
      prev.map((b) => (b.department === department ? { ...b, monthlyLimit: newLimit } : b))
    )
  }

  const handleSave = () => {
    notify.success("Đã lưu hạn mức ngân sách và giới hạn tốc độ (Rate Limits)!")
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
              {budgets.map((b) => {
                const percent = Math.min(Math.round((b.spent / b.monthlyLimit) * 100), 100)
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
                  <div className="font-mono text-sm font-bold text-primary">120</div>
                  <div className="text-[9px] text-muted-foreground">req / phút</div>
                </div>
                <div className="rounded border bg-card p-2 text-center">
                  <div className="text-[10px] text-muted-foreground">Max TPM</div>
                  <div className="font-mono text-sm font-bold text-primary">200K</div>
                  <div className="text-[9px] text-muted-foreground">token / phút</div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
