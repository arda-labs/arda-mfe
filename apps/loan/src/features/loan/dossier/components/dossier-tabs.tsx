import { useI18n } from "@workspace/i18n"
import { Badge } from "@workspace/ui/components/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { formatDateShort, formatMoney, fromMinor } from "@workspace/format"
import {
  type LoanAgreement,
  type LoanCollection,
  type LoanDisbursement,
  type LoanDossier,
  type LoanRepayPlan,
} from "../../../api"

/** Mirrors loan-service `domain.Mortgage` (subset the dossier renders). */
export interface DossierMortgage {
  id: string
  mortgage_code: string
  mortgage_no?: string
  customer_code?: string
  mortgage_date?: string
  notarization_date?: string
  registration_date?: string
  expire_date?: string
  status: string
}

/** Mirrors loan-service `domain.Collateral` (subset). */
export interface DossierCollateral {
  id: string
  coll_code: string
  coll_name: string
  coll_type_code?: string
  mortgage_code?: string
  owner_name?: string
  coll_address?: string
  coll_value_minor?: number
  coll_use_value_minor?: number
  status: string
}

export function DossierTabs({
  dossier,
  mortgages,
  collaterals,
}: {
  dossier: LoanDossier
  mortgages: DossierMortgage[]
  collaterals: DossierCollateral[]
}) {
  const { t } = useI18n()
  const contract = dossier.contract
  return (
    <Tabs defaultValue="overview" className="min-h-0">
      <TabsList>
        <TabsTrigger value="overview">
          {t("loan.dossier.tab.overview")}
        </TabsTrigger>
        <TabsTrigger value="movements">
          {t("loan.dossier.tab.movements")}
        </TabsTrigger>
        <TabsTrigger value="repay">
          {t("loan.dossier.tab.repay")}
        </TabsTrigger>
        <TabsTrigger value="collateral">
          {t("loan.dossier.tab.collateral")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4 pt-3">
        <div className="grid gap-x-8 gap-y-2 rounded-md border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Field label={t("loan.dossier.field.code")} value={contract.contract_code} />
          <Field label={t("loan.dossier.field.customer")} value={contract.customer_code} />
          <Field label={t("loan.dossier.field.status")} value={contract.status} />
          <Field
            label={t("loan.dossier.field.amount")}
            value={formatMoney(fromMinor(contract.loan_amt_minor))}
          />
          <Field
            label={t("loan.dossier.field.rate")}
            value={contract.interest_rate !== undefined ? String(contract.interest_rate) : "—"}
          />
          <Field
            label={t("loan.dossier.field.term")}
            value={contract.loan_term ? `${contract.loan_term} ${contract.term_unit ?? ""}` : "—"}
          />
          <Field
            label={t("loan.dossier.field.contract_date")}
            value={contract.contract_date ? formatDateShort(contract.contract_date) : "—"}
          />
          <Field
            label={t("loan.dossier.field.maturity")}
            value={contract.maturity_date ? formatDateShort(contract.maturity_date) : "—"}
          />
          <Field
            label={t("loan.dossier.field.case")}
            value={contract.workflow_case_code || "—"}
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("loan.dossier.col.agreement")}</TableHead>
                <TableHead>{t("loan.dossier.col.plan")}</TableHead>
                <TableHead className="text-right">
                  {t("loan.dossier.col.outstanding")}
                </TableHead>
                <TableHead className="text-right">
                  {t("loan.dossier.col.pending")}
                </TableHead>
                <TableHead>{t("loan.dossier.col.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dossier.agreements as LoanAgreement[]).map((agreement) => (
                <TableRow key={agreement.agreement_code}>
                  <TableCell className="font-medium tabular-nums">
                    {agreement.agreement_code}
                  </TableCell>
                  <TableCell>{agreement.plan_code || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(fromMinor(agreement.outstanding_amt_minor))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(fromMinor(agreement.pending_disburse_amt_minor))}
                  </TableCell>
                  <TableCell>{agreement.status}</TableCell>
                </TableRow>
              ))}
              {dossier.agreements.length === 0 ? (
                <EmptyRow colSpan={5} label={t("loan.dossier.empty")} />
              ) : null}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="movements" className="space-y-4 pt-3">
        <SectionTitle title={t("loan.dossier.section.disbursements")} />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("loan.dossier.col.date")}</TableHead>
                <TableHead>{t("loan.dossier.col.agreement")}</TableHead>
                <TableHead className="text-right">
                  {t("loan.dossier.col.amount")}
                </TableHead>
                <TableHead>{t("loan.dossier.col.flow")}</TableHead>
                <TableHead>{t("loan.dossier.col.status")}</TableHead>
                <TableHead>{t("loan.dossier.col.case")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dossier.disbursements as LoanDisbursement[]).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateShort(row.disburse_date)}
                  </TableCell>
                  <TableCell className="tabular-nums">{row.agreement_code}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(fromMinor(row.disburse_amt_minor, row.currency_code))}
                  </TableCell>
                  <TableCell>{row.flow_type || "—"}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.workflow_case_code || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {dossier.disbursements.length === 0 ? (
                <EmptyRow colSpan={6} label={t("loan.dossier.empty")} />
              ) : null}
            </TableBody>
          </Table>
        </div>

        <SectionTitle title={t("loan.dossier.section.collections")} />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("loan.dossier.col.date")}</TableHead>
                <TableHead>{t("loan.dossier.col.agreement")}</TableHead>
                <TableHead className="text-right">
                  {t("loan.dossier.col.principal")}
                </TableHead>
                <TableHead className="text-right">
                  {t("loan.dossier.col.interest")}
                </TableHead>
                <TableHead>{t("loan.dossier.col.status")}</TableHead>
                <TableHead>{t("loan.dossier.col.case")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(dossier.collections as LoanCollection[]).map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateShort(row.collection_date)}
                  </TableCell>
                  <TableCell className="tabular-nums">{row.agreement_code}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(fromMinor(row.principal_minor, row.currency_code))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(fromMinor(row.interest_minor, row.currency_code))}
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="tabular-nums">
                    {row.workflow_case_code || "—"}
                  </TableCell>
                </TableRow>
              ))}
              {dossier.collections.length === 0 ? (
                <EmptyRow colSpan={6} label={t("loan.dossier.empty")} />
              ) : null}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="repay" className="pt-3">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">{t("loan.dossier.col.plan_no")}</TableHead>
                <TableHead>{t("loan.dossier.col.due_date")}</TableHead>
                <TableHead className="text-right">
                  {t("loan.dossier.col.principal")}
                </TableHead>
                <TableHead className="text-right">
                  {t("loan.dossier.col.interest")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortPlans(dossier.repay_plans).map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="tabular-nums">{plan.plan_no}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateShort(plan.to_date)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(fromMinor(plan.plan_principal_amt_minor))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(fromMinor(plan.plan_interest_amt_minor))}
                  </TableCell>
                </TableRow>
              ))}
              {dossier.repay_plans.length === 0 ? (
                <EmptyRow colSpan={4} label={t("loan.dossier.empty")} />
              ) : null}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="collateral" className="space-y-4 pt-3">
        <SectionTitle title={t("loan.dossier.section.mortgages")} />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("loan.dossier.col.mortgage")}</TableHead>
                <TableHead>{t("loan.dossier.col.customer")}</TableHead>
                <TableHead>{t("loan.dossier.col.date")}</TableHead>
                <TableHead>{t("loan.dossier.col.expire")}</TableHead>
                <TableHead>{t("loan.dossier.col.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mortgages.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium tabular-nums">
                    {row.mortgage_code}
                  </TableCell>
                  <TableCell>{row.customer_code || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.mortgage_date ? formatDateShort(row.mortgage_date) : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {row.expire_date ? formatDateShort(row.expire_date) : "—"}
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
              {mortgages.length === 0 ? (
                <EmptyRow colSpan={5} label={t("loan.dossier.empty")} />
              ) : null}
            </TableBody>
          </Table>
        </div>

        <SectionTitle title={t("loan.dossier.section.collaterals")} />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("loan.dossier.col.collateral")}</TableHead>
                <TableHead>{t("loan.dossier.col.owner")}</TableHead>
                <TableHead>{t("loan.dossier.col.type")}</TableHead>
                <TableHead className="text-right">
                  {t("loan.dossier.col.value")}
                </TableHead>
                <TableHead>{t("loan.dossier.col.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaterals.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.coll_name || row.coll_code}
                  </TableCell>
                  <TableCell>{row.owner_name || "—"}</TableCell>
                  <TableCell>{row.coll_type_code || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(fromMinor(row.coll_use_value_minor ?? row.coll_value_minor ?? 0))}
                  </TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
              {collaterals.length === 0 ? (
                <EmptyRow colSpan={5} label={t("loan.dossier.empty")} />
              ) : null}
            </TableBody>
          </Table>
        </div>

        <SectionTitle title={t("loan.dossier.section.cases")} />
        <div className="flex flex-wrap gap-2">
          {dossier.workflow_case_ids.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              {t("loan.dossier.empty")}
            </span>
          ) : (
            dossier.workflow_case_ids.map((caseId) => (
              <Badge key={caseId} variant="outline" className="tabular-nums">
                {caseId}
              </Badge>
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold">{title}</h3>
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className="py-6 text-center text-sm text-muted-foreground"
      >
        {label}
      </TableCell>
    </TableRow>
  )
}

function sortPlans(plans: LoanRepayPlan[]) {
  return [...plans].sort(
    (a, b) => a.plan_no - b.plan_no || a.term_no - b.term_no
  )
}
