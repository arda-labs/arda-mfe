import { useCallback, useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useAuthStore } from "@workspace/auth/store"
import { useI18n, translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { navigateTo } from "@workspace/ui/shell/routing"
import { Badge } from "@workspace/ui/components/badge"
import { PostingTabsShell } from "@workspace/posting-flow/posting-flow-shell"
import { todayISO } from "@workspace/format"
import type {
  LoanDossier,
  LoanFormationStepCode,
} from "../api"
import { formationApi } from "../api"
import {
  hasTaskContext,
  isViewOnlyTaskContext,
  resolveWorkflowJobKey,
  stringParam,
  useFormationTaskContext,
} from "./utils/task-context"
import { postTaskWorkbenchHref } from "./utils/workbench-return"
import { approvalTierOf, stringVariable } from "./utils/stage"
import {
  proposalPayload,
  proposalValuesFromContract,
  type ProposalFormValues,
} from "./components/proposal-fields"
import {
  type AppraisalFormValues,
  type ApprovalFormValues,
} from "./components/stage-forms"
import { buildFormationTabs } from "./components/formation-tabs"
import { FormationFooterActions } from "./components/footer-actions"

/**
 * Màn hình giai đoạn hình thành khoản vay (LOAN_FORMATION_V2 — EPAS
 * LNM.201.01): tabs cộng dồn theo stage BPMN, deep-link workbench
 * `?workItemId=&returnUrl=` → claim → complete từ màn (mirror CRM
 * registration-page: task-context/resolveWorkflowJobKey/postTaskWorkbenchHref).
 */
export function FormationPage() {
  const { t } = useI18n()
  const user = useAuthStore((state) => state.user)
  const [searchParams] = useSearchParams()
  const {
    context,
    workItem,
    isError: taskContextError,
    isLoading: taskContextLoading,
  } = useFormationTaskContext()

  const viewOnly =
    isViewOnlyTaskContext() ||
    (workItem ? workItem.canClaim === false : false) ||
    !hasTaskContext(context)
  const stage = context.elementId
  const returnUrl = stringParam(searchParams, "returnUrl")

  // ── Case variables + dossier (stage data + contract snapshot) ──
  const [variables, setVariables] = useState<Record<string, unknown>>({})
  const [dossier, setDossier] = useState<LoanDossier | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setDataLoading(true)
    const caseLoad = context.caseId
      ? formationApi
          .getCaseVariables(context.caseId)
          .then((res) => {
            if (!cancelled) setVariables(res.variables ?? {})
          })
      : Promise.resolve()
    const dossierLoad = context.contractId
      ? formationApi
          .getDossier(context.contractId)
          .then((res) => {
            if (!cancelled) setDossier(res)
          })
      : Promise.resolve()
    void Promise.all([caseLoad, dossierLoad])
      .catch(() => {
        if (!cancelled) {
          setVariables({})
          setDossier(null)
        }
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [context.caseId, context.contractId])

  const contract = dossier?.contract ?? null

  // ── Claim trước khi mở form editable (mirror resolveWorkflowJobKey CRM:
  //    có sẵn jobKey từ work item thì dùng luôn, thiếu thì claim retry 3 lần) ──
  const [resolved, setResolved] = useState<{
    jobKey: string
    processInstanceKey: string
    elementId: string
  } | null>(null)
  const claimStartedRef = useRef(false)
  useEffect(() => {
    if (viewOnly || !stage || claimStartedRef.current) return
    if (!context.processInstanceKey || !context.elementId) return
    claimStartedRef.current = true
    void resolveWorkflowJobKey(context, t).then((result) => {
      if (result) setResolved(result)
    })
  }, [viewOnly, stage, context, t])

  const editableStage: LoanFormationStepCode | null =
    !viewOnly && resolved && stage ? stage : null
  const isMakerStage = editableStage === "UT_MakerInput"

  // ── Forms (plain state — app loan không dùng react-hook-form) ──
  const officerAuto =
    user?.displayName || (user?.name ?? "") || user?.username || ""
  const [proposal, setProposal] = useState<ProposalFormValues | null>(null)
  useEffect(() => {
    if (!proposal && contract) setProposal(proposalValuesFromContract(contract))
  }, [contract, proposal])

  const [appraisal, setAppraisal] = useState<AppraisalFormValues | null>(null)
  useEffect(() => {
    if (appraisal) return
    const amountMinor = Number(variables["amount"])
    setAppraisal({
      appraisalNumber: stringVariable(variables, "appraisalNumber"),
      appraisalDate: stringVariable(variables, "appraisalDate") || todayISO(),
      appraisalOfficer: stringVariable(variables, "appraisalOfficer"),
      appraisalOpinion: stringVariable(variables, "appraisalOpinion"),
      appraisalAmount:
        stringVariable(variables, "appraisalAmount") ||
        (Number.isFinite(amountMinor) ? String(amountMinor) : ""),
      appraisalRate:
        stringVariable(variables, "appraisalRate") ||
        (contract?.interest_rate != null ? String(contract.interest_rate) : ""),
      appraisalTerm:
        stringVariable(variables, "appraisalTerm") ||
        (contract?.loan_term != null ? String(contract.loan_term) : ""),
    })
  }, [appraisal, variables, contract])

  const [approval, setApproval] = useState<ApprovalFormValues | null>(null)
  useEffect(() => {
    if (approval) return
    setApproval({
      approvalOfficer: stringVariable(variables, "approvalOfficer"),
      approvalNumber: stringVariable(variables, "approvalNumber"),
      approvalDate: stringVariable(variables, "approvalDate") || todayISO(),
      approvalComment: stringVariable(variables, "approvalComment"),
    })
  }, [approval, variables])

  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)

  const goBack = useCallback(() => {
    navigateTo(returnUrl ?? "/loans")
  }, [returnUrl])

  const completeCurrentTask = useCallback(
    async (variablesPayload: Record<string, unknown>) => {
      const target = resolved ?? (await resolveWorkflowJobKey(context, t))
      if (!target) return false
      try {
        await formationApi.completeTask({
          jobKey: target.jobKey,
          processInstanceKey: target.processInstanceKey,
          elementId: target.elementId,
          variables: variablesPayload,
        })
        return true
      } catch (error) {
        notify.error(
          translateApiError(error, t("loan.formation.workflow.task_complete_failed"))
        )
        return false
      }
    },
    [context, resolved, t]
  )

  const finish = useCallback(() => {
    notify.success(t("loan.formation.workflow.task_complete_success"))
    navigateTo(returnUrl ?? postTaskWorkbenchHref())
  }, [returnUrl, t])

  // ── Maker: PUT contract whitelist rồi complete {submissionConfirmed} ──
  const submitMaker = useCallback(async () => {
    if (submittingRef.current || !proposal || !context.contractId) return
    const payload = proposalPayload(proposal)
    if (
      payload.loan_amt_minor <= 0 ||
      payload.interest_rate <= 0 ||
      payload.loan_term <= 0
    ) {
      notify.error(t("loan.formation.proposal.validation"))
      return
    }
    submittingRef.current = true
    setSubmitting(true)
    try {
      try {
        await formationApi.updateContract(context.contractId, payload)
      } catch (error) {
        notify.error(
          translateApiError(error, t("loan.formation.proposal.save_failed"))
        )
        return
      }
      if (await completeCurrentTask({ submissionConfirmed: true })) finish()
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }, [proposal, context.contractId, completeCurrentTask, finish, t])

  // ── Reviewer stages: complete {…stage fields, decision} ──
  const decide = useCallback(
    async (decision: "APPROVE" | "REJECT") => {
      if (submittingRef.current || !stage || !editableStage) return
      if (stage === "UT_TWRevalidate") {
        if (!appraisal) return
        if (!appraisal.appraisalNumber.trim() || !appraisal.appraisalDate.trim()) {
          notify.error(t("loan.formation.appraisal.validation"))
          return
        }
        submittingRef.current = true
        setSubmitting(true)
        try {
          if (
            await completeCurrentTask({
              appraisalNumber: appraisal.appraisalNumber.trim(),
              appraisalDate: appraisal.appraisalDate.trim(),
              appraisalOfficer: appraisal.appraisalOfficer.trim() || officerAuto,
              appraisalOpinion: appraisal.appraisalOpinion.trim(),
              appraisalAmount: Number(appraisal.appraisalAmount) || 0,
              appraisalRate: Number(appraisal.appraisalRate) || 0,
              appraisalTerm: Number(appraisal.appraisalTerm) || 0,
              decision,
            })
          )
            finish()
        } finally {
          submittingRef.current = false
          setSubmitting(false)
        }
        return
      }
      if (!approval) return
      const tier = approvalTierOf(stage)
      const numberRequired = tier === "GD" || tier === "BOARD"
      if (numberRequired && !approval.approvalNumber.trim()) {
        notify.error(
          t("loan.formation.approval.validation_number", {
            tier: t(`loan.formation.approval.tier.${tier}`),
          })
        )
        return
      }
      submittingRef.current = true
      setSubmitting(true)
      try {
        if (
          await completeCurrentTask({
            approvalOfficer: approval.approvalOfficer.trim() || officerAuto,
            approvalNumber: approval.approvalNumber.trim(),
            approvalDate: approval.approvalDate.trim(),
            approvalComment: approval.approvalComment.trim(),
            decision,
          })
        )
          finish()
      } finally {
        submittingRef.current = false
        setSubmitting(false)
      }
    },
    [stage, editableStage, appraisal, approval, completeCurrentTask, finish, officerAuto, t]
  )

  // ── Early returns cho loading/error (trước mọi render logic của shell) ──
  if (taskContextLoading || taskContextError || dataLoading || !contract) {
    const message = taskContextError
      ? t("loan.formation.load_failed")
      : !contract && !taskContextLoading && !dataLoading
        ? t("loan.formation.missing_contract")
        : t("loan.formation.loading")
    return (
      <section className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]">
          <h1 className="text-2xl font-semibold">{t("loan.formation.title")}</h1>
          <div
            className={`mt-4 rounded-md border px-4 py-3 text-sm ${
              taskContextError || (!contract && !dataLoading && !taskContextLoading)
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : "text-muted-foreground"
            }`}
          >
            {message}
          </div>
        </div>
        <FormationFooterActions
          canComplete={false}
          isMaker={false}
          isSubmitting={false}
          onBack={goBack}
        />
      </section>
    )
  }

  const tabs = buildFormationTabs({
    stage,
    editableStage,
    variables,
    contract,
    repayPlans: dossier?.repay_plans ?? [],
    proposal,
    appraisal,
    approval,
    officerAuto,
    submitting,
    onProposalChange: setProposal,
    onAppraisalChange: setAppraisal,
    onApprovalChange: setApproval,
  })

  return (
    <PostingTabsShell
      labels={{
        title: t("loan.formation.title"),
        description: t("loan.formation.description"),
      }}
      meta={
        <>
          <Badge variant="secondary" className="shrink-0">
            {t(stageLabelKey(stage))}
          </Badge>
          <Badge variant="outline" className="shrink-0">
            {contractStatusLabel(contract.status, t)}
          </Badge>
          {viewOnly ? (
            <Badge variant="outline" className="shrink-0">
              {t("loan.formation.view_only")}
            </Badge>
          ) : null}
        </>
      }
      tabs={tabs}
      defaultValue={stage ? editableTabFor(stage) : "proposal"}
      footer={
        <FormationFooterActions
          canComplete={Boolean(editableStage)}
          isMaker={isMakerStage}
          isSubmitting={submitting}
          onSubmitMaker={submitMaker}
          onApprove={() => void decide("APPROVE")}
          onReject={() => void decide("REJECT")}
          onBack={goBack}
        />
      }
    />
  )
}

function stageLabelKey(stage: LoanFormationStepCode | null) {
  return stage
    ? `loan.formation.stage.${stage}`
    : "loan.formation.stage.unknown"
}

function editableTabFor(stage: LoanFormationStepCode) {
  switch (stage) {
    case "UT_MakerInput":
      return "proposal"
    case "UT_TWRevalidate":
      return "appraisal"
    default:
      return "approval"
  }
}

/** Trạng thái hợp đồng → label i18n (fallback: raw status). */
function contractStatusLabel(status: string, t: (key: string) => string) {
  const key = `loan.status.${status.toLowerCase()}`
  const label = t(key)
  return label === key ? status : label
}
