import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import {
  textValue,
  type ToolResultPayload,
} from "../../lib/messages"
import type { ToolResultViewProps } from "../../lib/registry"
import { registerToolRenderer } from "../../lib/registry"

type FinanceAccount = {
  id?: string
  code: string
  name: string
  type?: string
  normalBalance?: string
  currency?: string
  isActive?: boolean
  balance?: string | number
}

function isFinanceAccount(result: ToolResultPayload): boolean {
  if (result.account && typeof result.account === "object") {
    const acc = result.account as Record<string, unknown>
    return typeof acc.code === "string" && typeof acc.name === "string"
  }
  return (
    typeof result.code === "string" &&
    typeof result.name === "string" &&
    (typeof result.normalBalance === "string" || typeof result.currency === "string")
  )
}

function toFinanceAccount(result: ToolResultPayload): FinanceAccount {
  const acc = (result.account && typeof result.account === "object" ? result.account : result) as Record<string, unknown>
  const bal = result.balance ?? acc.balance
  return {
    id: textValue(acc.id) || undefined,
    code: textValue(acc.code),
    name: textValue(acc.name),
    type: textValue(acc.type) || undefined,
    normalBalance: textValue(acc.normalBalance) || undefined,
    currency: textValue(acc.currency) || "VND",
    isActive: typeof acc.isActive === "boolean" ? acc.isActive : true,
    balance: typeof bal === "number" || typeof bal === "string" ? bal : undefined,
  }
}

export function FinanceAccountCard({ result }: ToolResultViewProps) {
  const { t } = useI18n()
  if (!isFinanceAccount(result)) return null
  const account = toFinanceAccount(result)

  return (
    <div className="mt-3 rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold">{account.name}</p>
        <Badge variant={account.isActive ? "default" : "secondary"}>
          {account.isActive ? t("ai.tool.financeAccount.status", { status: "ACTIVE" }) : "INACTIVE"}
        </Badge>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <div>
          <dt className="text-muted-foreground">{t("ai.tool.financeAccount.code")}</dt>
          <dd className="font-medium font-mono">{account.code}</dd>
        </div>
        {account.type && (
          <div>
            <dt className="text-muted-foreground">{t("ai.tool.financeAccount.type")}</dt>
            <dd className="font-medium">{account.type}</dd>
          </div>
        )}
        {account.currency && (
          <div>
            <dt className="text-muted-foreground">{t("ai.tool.financeAccount.currency")}</dt>
            <dd className="font-medium">{account.currency}</dd>
          </div>
        )}
        {account.balance !== undefined && (
          <div>
            <dt className="text-muted-foreground">{t("ai.tool.financeAccount.balance")}</dt>
            <dd className="font-medium tabular-nums">
              {typeof account.balance === "number"
                ? account.balance.toLocaleString("vi-VN")
                : String(account.balance)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export function registerFinanceAccountRenderer() {
  registerToolRenderer({
    id: "finance.account-view",
    match: isFinanceAccount,
    component: FinanceAccountCard,
  })
}
