import { useI18n } from "@workspace/i18n"
import type { PostingTabItem } from "@workspace/posting-flow/types"
import { formatMoney, fromMinor } from "@workspace/format"
import type { LoanDossier, LoanFormationStepCode } from "../../api"
import { numericVariable, stringVariable } from "../utils/stage"
import {
  ProposalFields,
  type ProposalFormValues,
} from "./proposal-fields"
import {
  AppraisalFields,
  ApprovalFields,
  ContractSnapshot,
  StageVariableList,
  type AppraisalFormValues,
  type ApprovalFormValues,
} from "./stage-forms"

/**
 * Tab config cộng dồn của màn formation (EPAS LNM.201.01): "Hồ sơ đề nghị"
 * luôn có; "Thẩm định" mở từ UT_TWRevalidate; "Phê duyệt" mở từ UT_PGDReview;
 * "Hợp đồng" snapshot cuối. Tab của stage hiện tại render form editable,
 * các tab trước đó render read-only từ case variables.
 */
export function buildFormationTabs({
  stage,
  editableStage,
  variables,
  contract,
  repayPlans,
  proposal,
  appraisal,
  approval,
  officerAuto,
  submitting,
  onProposalChange,
  onAppraisalChange,
  onApprovalChange,
}: {
  stage: LoanFormationStepCode | null
  editableStage: LoanFormationStepCode | null
  variables: Record<string, unknown>
  contract: LoanDossier["contract"] | null
  repayPlans: LoanDossier["repay_plans"]
  proposal: ProposalFormValues | null
  appraisal: AppraisalFormValues | null
  approval: ApprovalFormValues | null
  officerAuto: string
  submitting: boolean
  onProposalChange: (next: ProposalFormValues) => void
  onAppraisalChange: (next: AppraisalFormValues) => void
  onApprovalChange: (next: ApprovalFormValues) => void
}): PostingTabItem[] {
  const { t } = useI18n()
  const isMakerStage = editableStage === "UT_MakerInput"
  const amountMinor = numericVariable(variables, "amount")
  const stageIdx = stage ? STAGE_ORDER.indexOf(stage) : -1

  const tabs: PostingTabItem[] = [
    {
      id: "proposal",
      label: t("loan.formation.tab.proposal"),
      content: (
        <div className="space-y-4">
          <StageVariableList
            entries={[
              {
                label: t("loan.formation.variable.amount"),
                value:
                  amountMinor != null ? formatMoney(fromMinor(amountMinor)) : "",
              },
              {
                label: t("loan.formation.variable.fund_source"),
                value: stringVariable(variables, "fundSource"),
              },
            ]}
          />
          {proposal ? (
            <fieldset disabled={!isMakerStage}>
              <ProposalFields
                values={proposal}
                onChange={onProposalChange}
                disabled={!isMakerStage}
              />
            </fieldset>
          ) : null}
        </div>
      ),
    },
  ]

  if (stageIdx >= STAGE_ORDER.indexOf("UT_TWRevalidate")) {
    tabs.push({
      id: "appraisal",
      label: t("loan.formation.tab.appraisal"),
      content:
        editableStage === "UT_TWRevalidate" && appraisal ? (
          <fieldset disabled={submitting}>
            <AppraisalFields
              values={appraisal}
              onChange={onAppraisalChange}
              officerAuto={officerAuto}
            />
          </fieldset>
        ) : (
          <StageVariableList entries={appraisalEntries(variables, t)} />
        ),
    })
  }

  if (stageIdx >= STAGE_ORDER.indexOf("UT_PGDReview")) {
    const tier =
      stage === "UT_GDReview"
        ? "GD"
        : stage === "UT_BoardReview"
          ? "BOARD"
          : "PGD"
    const editable =
      editableStage === "UT_PGDReview" ||
      editableStage === "UT_GDReview" ||
      editableStage === "UT_BoardReview"
    tabs.push({
      id: "approval",
      label: t("loan.formation.tab.approval"),
      content:
        editable && approval ? (
          <fieldset disabled={submitting}>
            <ApprovalFields
              values={approval}
              onChange={onApprovalChange}
              officerAuto={officerAuto}
              tier={tier}
            />
          </fieldset>
        ) : (
          <StageVariableList entries={approvalEntries(variables, t)} />
        ),
    })
  }

  tabs.push({
    id: "contract",
    label: t("loan.formation.tab.contract"),
    content: (
      <ContractSnapshot contract={contract} repayPlans={repayPlans} />
    ),
  })

  return tabs
}

const STAGE_ORDER: LoanFormationStepCode[] = [
  "UT_MakerInput",
  "UT_TWRevalidate",
  "UT_PGDReview",
  "UT_GDReview",
  "UT_BoardReview",
]

/** Read-only appraisal stage (tab xem lại sau khi TW đã hoàn thành). */
function appraisalEntries(
  variables: Record<string, unknown>,
  t: (key: string) => string
) {
  return [
    {
      label: t("loan.formation.appraisal.field.appraisal_number"),
      value: stringVariable(variables, "appraisalNumber"),
    },
    {
      label: t("loan.formation.appraisal.field.appraisal_date"),
      value: stringVariable(variables, "appraisalDate"),
    },
    {
      label: t("loan.formation.appraisal.field.appraisal_officer"),
      value: stringVariable(variables, "appraisalOfficer"),
    },
    {
      label: t("loan.formation.appraisal.field.appraisal_amount"),
      value: stringVariable(variables, "appraisalAmount"),
    },
    {
      label: t("loan.formation.appraisal.field.appraisal_rate"),
      value: stringVariable(variables, "appraisalRate"),
    },
    {
      label: t("loan.formation.appraisal.field.appraisal_term"),
      value: stringVariable(variables, "appraisalTerm"),
    },
    {
      label: t("loan.formation.appraisal.field.appraisal_opinion"),
      value: stringVariable(variables, "appraisalOpinion"),
    },
  ]
}

/** Read-only approval stage (tab xem lại sau khi cấp trên đã duyệt). */
function approvalEntries(
  variables: Record<string, unknown>,
  t: (key: string) => string
) {
  return [
    {
      label: t("loan.formation.approval.field.approval_officer"),
      value: stringVariable(variables, "approvalOfficer"),
    },
    {
      label: t("loan.formation.approval.field.approval_number"),
      value: stringVariable(variables, "approvalNumber"),
    },
    {
      label: t("loan.formation.approval.field.approval_date"),
      value: stringVariable(variables, "approvalDate"),
    },
    {
      label: t("loan.formation.approval.field.approval_comment"),
      value: stringVariable(variables, "approvalComment"),
    },
  ]
}
