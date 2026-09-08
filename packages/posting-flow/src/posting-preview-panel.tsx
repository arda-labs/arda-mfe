import { useMemo, useState } from "react"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatAmount, fromMinor, parseMoneyInput, toMinor } from "@workspace/format"
import {
  type EntryLineRow,
  type PostingPreviewPanelLabels,
  type PostingValidateInput,
  type PostingValidateResult,
  type ValidateFn,
} from "./types"

/**
 * Live posting preview: sends the current rows to the consumer's validate
 * endpoint and shows resolved account code/name, per-line errors, global
 * errors and the COA version — ported from finance's PostingPreviewDialog
 * (iter-9 refactor: inline panel, no dialog, caller supplies the transport).
 * The result is tagged with a snapshot of its inputs; any edit afterwards
 * marks it stale instead of wiping it (no setState-in-effect).
 */
export function PostingPreviewPanel({
  accountingDate,
  currency,
  documentType,
  rows,
  validate,
  labels,
}: {
  accountingDate: string
  currency: string
  documentType: string
  rows: EntryLineRow[]
  validate: ValidateFn
  labels: PostingPreviewPanelLabels
}) {
  const [result, setResult] = useState<PostingValidateResult | null>(null)
  /** Signature of the inputs the current `result` was computed from. */
  const [resultSource, setResultSource] = useState<string>("")
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  const input = useMemo<PostingValidateInput>(
    () => ({
      accounting_date: accountingDate,
      currency_code: currency,
      document_type: documentType,
      lines: rows.map((row, index) => ({
        line_no: index + 1,
        direction: row.direction,
        amount_minor: toMinorOf(row.amount, currency),
        account_code: row.account_code,
        description: row.description || undefined,
      })),
    }),
    [accountingDate, currency, documentType, rows]
  )

  const sourceSignature = useMemo(
    () => JSON.stringify([accountingDate, currency, documentType, input.lines]),
    [accountingDate, currency, documentType, input.lines]
  )

  const run = async () => {
    setPending(true)
    setFailed(false)
    try {
      setResult(await validate(input))
      setResultSource(sourceSignature)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  const stale = result !== null && sourceSignature !== resultSource

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => void run()} disabled={pending}>
          {pending ? labels.resolving : labels.title}
        </Button>
        {failed ? (
          <span className="text-xs text-destructive">{labels.validateFailed}</span>
        ) : null}
        {result ? (
          <>
            <Badge variant={result.valid ? "default" : "destructive"}>
              {result.valid ? labels.valid : labels.invalid}
            </Badge>
            {stale ? (
              <Badge variant="outline">{labels.stale}</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">
                {labels.coaVersion}: {result.coa_version_id || "—"}
              </span>
            )}
          </>
        ) : null}
      </div>

      {result ? (
        <div className="space-y-2">
          {result.global_errors.length > 0 ? (
            <p className="text-xs text-destructive">
              {labels.globalErrors}: {result.global_errors.join(", ")}
            </p>
          ) : null}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-24">{labels.colDirection}</TableHead>
                  <TableHead>{labels.colAccount}</TableHead>
                  <TableHead className="text-right">{labels.colAmount}</TableHead>
                  <TableHead>{labels.colErrors}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.lines.map((line) => (
                  <TableRow key={line.line_no}>
                    <TableCell className="text-xs">{line.line_no}</TableCell>
                    <TableCell>
                      <Badge variant={line.direction === "DEBIT" ? "secondary" : "outline"}>
                        {line.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {line.resolved ? (
                        <span>
                          <span className="font-mono text-xs">{line.account_code}</span>{" "}
                          {line.account_name}
                        </span>
                      ) : (
                        <span className="text-xs text-destructive">{labels.unresolved}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatAmount(fromMinor(line.amount_minor, currency), currency)}
                    </TableCell>
                    <TableCell className="text-xs text-destructive">
                      {line.errors.join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function toMinorOf(raw: string, currency: string): number {
  const major = parseMoneyInput(raw)
  return major === undefined ? 0 : toMinor(major, currency)
}
