import { useQuery } from "@tanstack/react-query"
import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { loanApi, type LoanBatchDocumentType } from "../../api"

/**
 * "Bút toán dự kiến" preview — renders the BE-declared posting rules for one
 * document type verbatim (`GET /api/loan/posting-rules?document_type=…`).
 * The FE never builds bút toán itself: Nợ/Có pairs (e.g. the two interest
 * lines of LNM_COLLECTION) simply appear or not depending on the items the
 * BE returns. Read-only reference block at the bottom of the grid tab.
 */
export function PostingRulesPreview({
  documentType,
}: {
  documentType: LoanBatchDocumentType
}) {
  const { t } = useI18n()

  const rulesQuery = useQuery({
    queryKey: ["loan", "posting-rules", documentType],
    queryFn: () => loanApi.postingRules(documentType),
    staleTime: 5 * 60 * 1000,
  })

  const items = rulesQuery.data?.items ?? []

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">
        {t("loan.posting_preview.title")}
      </p>
      {rulesQuery.isError ? (
        <p className="text-xs text-destructive">{t("loan.posting_preview.load_failed")}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{t("common.field.stt")}</TableHead>
                <TableHead className="w-16">{t("loan.posting_preview.col_direction")}</TableHead>
                <TableHead>{t("loan.posting_preview.col_account")}</TableHead>
                <TableHead>{t("loan.posting_preview.col_resolution")}</TableHead>
                <TableHead>{t("loan.posting_preview.col_classification")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-4 text-center text-sm text-muted-foreground">
                    {rulesQuery.isLoading ? "…" : t("loan.posting_preview.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((rule) => (
                  <TableRow key={rule.line_no}>
                    <TableCell className="text-xs">{rule.line_no}</TableCell>
                    <TableCell>
                      <Badge variant={rule.direction === "DEBIT" ? "secondary" : "outline"}>
                        {rule.direction === "DEBIT"
                          ? t("loan.posting_preview.debit")
                          : t("loan.posting_preview.credit")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{rule.account_ref}</TableCell>
                    <TableCell className="text-xs">{rule.resolution_type}</TableCell>
                    <TableCell className="text-xs">
                      {rule.acc_classification || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
