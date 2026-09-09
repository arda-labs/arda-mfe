import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatAmount, fromMinor } from "@workspace/format"
import { loanApi, type LoanAgreement, type LoanContract } from "../../api"

/** Dialog page size — matches the posting-flow pickers (8 rows/page). */
const PAGE_SIZE = 8

/** One selectable agreement row inside the dialog (agreements of the contract). */
export type ContractPickerSelection = LoanAgreement & { contract: LoanContract }

/**
 * Contract + agreement picker for the batch grids (iteration 13): search by
 * contract no / CCCD over server-paged ACTIVE contracts (loanApi.listContracts),
 * expandable to the contract's agreements (loanApi.listAgreements) with
 * outstanding/pending headroom columns. `multi` mode queues N picks (badge +
 * Xoá hết) for batch entry; single mode returns one row immediately.
 */
export function ChooseContractDialog({
  open,
  onOpenChange,
  onPick,
  multi = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called per chosen agreement (chọn 1 thêm 1 — dialog stays open in multi). */
  onPick: (selection: ContractPickerSelection) => void
  multi?: boolean
}) {
  const { t } = useI18n()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open ? (
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("loan.contract_picker.title")}</DialogTitle>
          </DialogHeader>
          <PickerContent
            onPick={onPick}
            multi={multi}
            onClose={() => onOpenChange(false)}
          />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

function PickerContent({
  onPick,
  multi,
  onClose,
}: {
  onPick: (selection: ContractPickerSelection) => void
  multi: boolean
  onClose: () => void
}) {
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<LoanContract | null>(null)
  /** Multi-mode queue (preview of pending picks before closing the dialog). */
  const [picked, setPicked] = useState<ContractPickerSelection[]>([])

  const contractsQuery = useQuery({
    queryKey: ["loan", "contract-picker", "contracts", search, page],
    queryFn: () =>
      loanApi.listContracts({ status: "ACTIVE", q: search || undefined, page, per_page: PAGE_SIZE }),
    placeholderData: (prev) => prev,
  })

  const agreementsQuery = useQuery({
    queryKey: ["loan", "contract-picker", "agreements", expanded?.contract_code],
    queryFn: () => loanApi.listAgreements(expanded?.contract_code ?? ""),
    enabled: expanded !== null,
  })

  const contracts = contractsQuery.data?.items ?? []
  const total = contractsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const agreements: LoanAgreement[] = expanded ? (agreementsQuery.data?.items ?? []) : []

  const pick = (agreement: LoanAgreement) => {
    if (!expanded) return
    const selection: ContractPickerSelection = { ...agreement, contract: expanded }
    if (multi) {
      setPicked((prev) => [...prev, selection])
    } else {
      onPick(selection)
      onClose()
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="contract-picker-search">{t("loan.contract_picker.search")}</Label>
            <Input
              id="contract-picker-search"
              placeholder={t("loan.contract_picker.search_placeholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          {multi && picked.length > 0 ? (
            <div className="flex items-center gap-2 pb-1">
              <span className="text-xs text-muted-foreground">
                {t("loan.contract_picker.picked_count", { count: picked.length })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => setPicked([])}
              >
                {t("loan.contract_picker.clear_picked")}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("loan.contract_picker.col_contract")}</TableHead>
                <TableHead>{t("loan.contract_picker.col_customer")}</TableHead>
                <TableHead className="text-right">
                  {t("loan.contract_picker.col_loan_amount")}
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    {contractsQuery.isLoading ? "…" : t("loan.contract_picker.empty")}
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow
                    key={contract.id}
                    className={
                      expanded?.id === contract.id ? "bg-muted/50" : "cursor-pointer"
                    }
                    onClick={() =>
                      setExpanded((prev) => (prev?.id === contract.id ? null : contract))
                    }
                  >
                    <TableCell className="font-mono text-xs">
                      {contract.contract_no || contract.contract_code}
                    </TableCell>
                    <TableCell className="text-xs">{contract.customer_code}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatAmount(fromMinor(contract.loan_amt_minor), "VND")}
                    </TableCell>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {expanded?.id === contract.id ? "▾" : "▸"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {expanded ? (
          <div className="rounded-md border bg-muted/30">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("loan.contract_picker.col_agreement")}</TableHead>
                  <TableHead className="text-right">
                    {t("loan.contract_picker.col_limit")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.contract_picker.col_outstanding")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("loan.contract_picker.col_pending")}
                  </TableHead>
                  <TableHead>{t("loan.contract_picker.col_plan")}</TableHead>
                  <TableHead className="w-16 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {agreements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                      {agreementsQuery.isLoading ? "…" : t("loan.contract_picker.no_agreements")}
                    </TableCell>
                  </TableRow>
                ) : (
                  agreements.map((agreement) => (
                    <TableRow key={agreement.agreement_code}>
                      <TableCell className="font-mono text-xs text-primary">
                        {agreement.agreement_code}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatAmount(fromMinor(agreement.disburse_amt_minor ?? 0), "VND")}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatAmount(fromMinor(agreement.outstanding_amt_minor), "VND")}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatAmount(fromMinor(agreement.pending_disburse_amt_minor), "VND")}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {agreement.plan_code || t("loan.batch_grid.no_plan")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => pick(agreement)}
                        >
                          {t("loan.contract_picker.choose")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("loan.contract_picker.expand_hint")}</p>
        )}
      </div>

      <DialogFooter className="items-center justify-between sm:justify-between">
        <span className="text-xs text-muted-foreground">
          {t("common.pagination.page_of")
            .replace("{page}", String(page))
            .replace("{totalPages}", String(totalPages))}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("common.action.prev")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {t("common.action.next")}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!multi || picked.length === 0}
            onClick={() => {
              picked.forEach((selection) => onPick(selection))
              setPicked([])
              onClose()
            }}
          >
            {t("loan.contract_picker.done")}
          </Button>
        </div>
      </DialogFooter>
    </>
  )
}
