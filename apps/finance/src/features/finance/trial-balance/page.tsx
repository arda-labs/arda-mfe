import { useEffect } from "react"
import { notify } from "@workspace/notifications/notify"
import { Spinner } from "@workspace/ui/components/spinner"
import { Badge } from "@workspace/ui/components/badge"
import { useTrialBalance } from "./queries"

export function TrialBalancePage() {
  const {
    data: entries = [],
    isError: isTrialBalanceError,
    isLoading,
  } = useTrialBalance()

  useEffect(() => {
    if (isTrialBalanceError) notify.error("Could not load trial balance")
  }, [isTrialBalanceError])

  if (isLoading)
    return (
      <div className="flex justify-center p-8">
        <Spinner className="size-6" />
      </div>
    )

  const totalDebit = entries
    .filter((e) => e.account.type === "ASSET" || e.account.type === "EXPENSE")
    .reduce((sum, e) => sum + parseFloat(e.balance?.balance || "0"), 0)

  const totalCredit = entries
    .filter(
      (e) =>
        e.account.type === "LIABILITY" ||
        e.account.type === "EQUITY" ||
        e.account.type === "INCOME"
    )
    .reduce((sum, e) => sum + parseFloat(e.balance?.balance || "0"), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="px-2.5 py-1 text-xs">
          Trial Balance
        </Badge>
        <span className="text-xs text-muted-foreground">
          As of {new Date().toLocaleDateString()}
        </span>
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="p-3 text-left font-medium">Account</th>
              <th className="p-3 text-left font-medium">Code</th>
              <th className="p-3 text-left font-medium">Type</th>
              <th className="p-3 text-right font-medium">Debit</th>
              <th className="p-3 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const isDebit =
                e.account.type === "ASSET" || e.account.type === "EXPENSE"
              const amt = parseFloat(e.balance?.balance || "0")
              return (
                <tr
                  key={e.account.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="p-3 font-medium">{e.account.name}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">
                    {e.account.code}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {e.account.type}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {isDebit ? amt.toLocaleString() : ""}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {!isDebit ? amt.toLocaleString() : ""}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="border-t bg-muted/30 font-medium">
            <tr>
              <td colSpan={3} className="p-3 text-right">
                Total
              </td>
              <td className="p-3 text-right font-mono">
                {totalDebit.toLocaleString()}
              </td>
              <td className="p-3 text-right font-mono">
                {totalCredit.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        {Math.abs(totalDebit - totalCredit) < 0.01
          ? "✓ Balanced (Total Debit = Total Credit)"
          : `✗ Unbalanced: difference ${(totalDebit - totalCredit).toLocaleString()}`}
      </p>
    </div>
  )
}
