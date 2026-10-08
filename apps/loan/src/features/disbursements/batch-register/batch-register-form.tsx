import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Save } from "lucide-react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useI18n, translateApiError } from "@workspace/i18n"
import { useAuthStore } from "@workspace/auth/store"
import { useStagedAttachments } from "@workspace/case-tabs"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  ControlInfoCard,
  ObjectInfoCard,
  PostingTabsShell,
} from "@workspace/posting-flow/posting-flow-shell"
import type { ObjectInfoValue } from "@workspace/posting-flow/types"
import {
  formatDateShort,
  formatAmount,
  fromMinor,
  todayISO,
} from "@workspace/format"
import { disbursementBatchApi, loanApi, type LoanAgreement, type LoanContract } from "../../api"
import {
  useBatchTabsLabels,
  useControlInfoLabels,
  useObjectInfoLabels,
  useObjectTypeOptions,
} from "../../loan-batches/labels"
import { inputToMinor } from "../../loan-batches/row-math"
import { RegisterContractsTab } from "./contracts-tab"
import { validateRegister, type RegisterValidationIssue } from "./validation"
import { shouldPersistRegisterDraft, shouldWarnRegisterExit } from "./flow-state"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

const TAB_INFO = "disburse-info"
const TAB_CONTRACTS = "disburse-contracts"
const TAB_REVIEW = "disburse-review"
const ATTACHMENT_IDS_KEY = "arda.loan.disbursement.attachments"

export interface RegisterRow {
  key: string
  contract: LoanContract
  agreement: LoanAgreement
  /** Số tiền giải ngân (major-unit input). */
  amount: string
}

/**
 * Đăng ký giải ngân (iteration 13) — EPAS list-edit-construct batch on the
 * PostingTabsShell. Tab 1: ngày/hình thức hạch toán/tài khoản/diễn giải +
 * trader; tab 2: grid gom nhóm theo plan_code, mỗi dòng một agreement với
 * số tiền riêng — tổng hồ sơ luôn suy ra từ các dòng. Submit posts the whole
 * batch (POST /api/loan/disbursement-batches); BE tự đọc plan_code từ
 * agreement và build bút toán.
 */
export function BatchRegisterForm() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resumeDraftId = searchParams.get("draftId") ?? undefined
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  // Files are attached to the workflow case after draft submit (T5.2).
  const staged = useStagedAttachments({ module: "loan" })
  const tabsLabels = useBatchTabsLabels(
    "loan.disbursements.batch.register_title",
    "loan.disbursements.batch.register_description"
  )
  const objectLabels = useObjectInfoLabels()
  const objectTypes = useObjectTypeOptions()
  const controlLabels = useControlInfoLabels()

  const [txnDate, setTxnDate] = useState(() => todayISO())
  const [paymentMethod, setPaymentMethod] = useState<"TRANSFER" | "CASH">("TRANSFER")
  const [accountCode, setAccountCode] = useState("")
  /** null = follow the auto description; a typed string = user override. */
  const [descriptionOverride, setDescriptionOverride] = useState<string | null>(null)
  const [rows, setRows] = useState<RegisterRow[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savePending, setSavePending] = useState(false)
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState(TAB_INFO)
  const [draftId, setDraftId] = useState<string>()
  const [dataVersion, setDataVersion] = useState<number>()
  const [savedAt, setSavedAt] = useState<Date>()
  const [dirty, setDirty] = useState(false)
  const [issues, setIssues] = useState<RegisterValidationIssue[]>([])
  const [resumeError, setResumeError] = useState(false)
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<number | undefined>(undefined)
  const [trader, setTrader] = useState<ObjectInfoValue>(() => ({
    object_type: "EMPLOYEE",
    object_code: user?.employeeId ?? user?.username ?? "",
    object_name: user?.displayName || (user?.name ?? ""),
    id_number: "",
    issue_date: "",
    issue_place: "",
    address: "",
  }))

  const unitName =
    user?.tenantMemberships?.find((m) => m.tenantId === (user.activeTenantId ?? user.tenantId))
      ?.tenantName ?? user?.tenantMemberships?.[0]?.tenantName

  // Diễn giải auto "Giải ngân theo hồ sơ ngày <date>" — null override
  // follows the auto value; user edits always win (no effect needed).
  const autoDescription = t("loan.disbursements.batch.description_auto", {
    date: formatDateShort(txnDate),
  })
  const shownDescription = descriptionOverride ?? autoDescription

  useEffect(() => {
    if (!resumeDraftId) return
    let cancelled = false
    void (async () => {
      try {
        const detail = await disbursementBatchApi.detail(resumeDraftId)
        if (detail.status !== "DRAFT" || detail.flow_type === "COMPLETE") {
          throw new Error("This is not an editable register draft")
        }
        const contractCodes = [...new Set((detail.rows ?? []).map((row) => row.contract_code))]
        const contracts = await Promise.all(
          contractCodes.map((code) => loanApi.listContracts({ q: code, per_page: 100 }))
        )
        const contractsByCode = new Map(
          contracts.flatMap((response) => response.items).map((contract) => [contract.contract_code, contract])
        )
        const agreementsByContract = await Promise.all(
          contractCodes.map((code) => loanApi.listAgreements(code))
        )
        const agreements = new Map(
          agreementsByContract.flatMap((response) => response.items).map((agreement) => [agreement.agreement_code, agreement])
        )
        const resumedRows = (detail.rows ?? []).map((row) => {
          const contract = contractsByCode.get(row.contract_code)
          const agreement = agreements.get(row.agreement_code)
          if (!contract || !agreement) throw new Error("Draft row reference could not be restored")
          return {
            key: crypto.randomUUID(),
            contract,
            agreement,
            amount: String(fromMinor(row.amount_minor, agreement.currency_code)),
          }
        })
        if (cancelled) return
        setDraftId(detail.id)
        setDataVersion(detail.data_version)
        setTxnDate(detail.txn_date)
        setPaymentMethod(detail.payment_method ?? "TRANSFER")
        setAccountCode(detail.account_code ?? "")
        setDescriptionOverride(detail.description ?? null)
        setTrader((current) => detail.trader ? { ...current, ...detail.trader } : current)
        setRows(resumedRows)
        setActiveTab(resumedRows.length ? TAB_CONTRACTS : TAB_INFO)
        setSavedAt(new Date())
      } catch {
        if (!cancelled) setResumeError(true)
      }
    })()
    return () => { cancelled = true }
  }, [resumeDraftId])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldWarnRegisterExit(dirty || staged.ids.length > 0 || staged.uploading)) return
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", beforeUnload)
    return () => window.removeEventListener("beforeunload", beforeUnload)
  }, [dirty, staged.ids.length, staged.uploading])

  const addRows = useCallback((picked: (LoanAgreement & { contract: LoanContract })[]) => {
    setDirty(true)
    setRows((prev) => {
      const seen = new Set(prev.map((row) => row.agreement.agreement_code))
      const added: RegisterRow[] = []
      for (const selection of picked) {
        if (seen.has(selection.agreement_code)) continue
        seen.add(selection.agreement_code)
        added.push({
          key: crypto.randomUUID(),
          contract: selection.contract,
          agreement: selection,
          amount: "",
        })
      }
      return [...prev, ...added]
    })
  }, [])

  const updateRow = useCallback((key: string, patch: Partial<RegisterRow>) => {
    setDirty(true)
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }, [])

  const removeRow = useCallback((key: string) => {
    setDirty(true)
    setRows((prev) => prev.filter((row) => row.key !== key))
  }, [])

  const removeGroup = useCallback((planCode: string) => {
    setDirty(true)
    setRows((prev) =>
      prev.filter((row) => (row.agreement.plan_code ?? "") !== planCode)
    )
  }, [])

  const validateRow = useCallback((row: RegisterRow) => {
    setIssues(validateRegister({ txnDate, paymentMethod, accountCode, rows }).filter(
      (issue) => issue.fieldId === `disburse-amount-${row.key}`
    ))
  }, [txnDate, paymentMethod, accountCode, rows])

  const rowAmountMinor = (row: RegisterRow) =>
    inputToMinor(row.amount, row.agreement.currency_code)

  const totalMinor = useMemo(
    () => rows.reduce((sum, row) => sum + rowAmountMinor(row), 0),
    [rows]
  )

  const previewQuery = useQuery({
    queryKey: ["loan", "disbursement-posting-preview", draftId, dataVersion],
    queryFn: () => disbursementBatchApi.preview(draftId as string),
    enabled: activeTab === TAB_REVIEW && Boolean(draftId) && !dirty,
    staleTime: 0,
  })

  const payload = (selectedRows = rows) => ({
    txn_date: txnDate,
    payment_method: paymentMethod,
    account_code: paymentMethod === "TRANSFER" ? accountCode.trim() : undefined,
    description: shownDescription || undefined,
    trader: {
      object_type: trader.object_type,
      object_code: trader.object_code,
      object_name: trader.object_name,
      id_number: trader.id_number || undefined,
      issue_date: trader.issue_date || undefined,
      issue_place: trader.issue_place || undefined,
      address: trader.address || undefined,
    },
    rows: selectedRows.map((row) => ({
      contract_code: row.contract.contract_code,
      agreement_code: row.agreement.agreement_code,
      amount_minor: rowAmountMinor(row),
    })),
  })

  const runValidation = () => {
    const nextIssues = validateRegister({ txnDate, paymentMethod, accountCode, rows })
    setIssues(nextIssues)
    if (nextIssues.length > 0) {
      requestAnimationFrame(() => errorSummaryRef.current?.focus())
      return false
    }
    return true
  }

  const persistDraft = async (allowEmptyRows = false) => {
    setSavePending(true)
    try {
      let id = draftId
      let version = dataVersion
      if (!id) {
        const created = await disbursementBatchApi.createRegister(
          payload(allowEmptyRows ? [] : rows)
        )
        id = created.id
        version = created.data_version
        setDraftId(id)
        setDataVersion(version)
      } else if (version != null) {
        const updated = await disbursementBatchApi.updateDraft(id, {
          ...payload(),
          data_version: version,
        })
        version = updated.data_version ?? version + 1
        setDataVersion(version)
      }
      setDirty(false)
      setSavedAt(new Date())
      setIssues([])
      await queryClient.invalidateQueries({ queryKey: ["loan"] })
      return { id, version }
    } catch (error) {
      notify.error(
        translateApiError(error, "loan.disbursements.batch.create_failed")
      )
      throw error
    } finally {
      setSavePending(false)
    }
  }

  useEffect(() => {
    if (!draftId || !dirty || savePending) return
    const validation = validateRegister({ txnDate, paymentMethod, accountCode, rows })
    const headerInvalid = validation.some((issue) => issue.fieldId !== "disburse-rows" && !issue.fieldId.startsWith("disburse-amount-"))
    const rowsInvalid = validation.some((issue) => issue.fieldId.startsWith("disburse-amount-"))
    if (headerInvalid || (rows.length > 0 && rowsInvalid)) return
    saveTimerRef.current = window.setTimeout(() => {
      void persistDraft().catch(() => undefined)
    }, 600)
    return () => window.clearTimeout(saveTimerRef.current)
  }, [draftId, dirty, savePending, txnDate, paymentMethod, accountCode, rows, activeTab])

  const changeTab = async (nextTab: string) => {
    window.clearTimeout(saveTimerRef.current)
    const order = [TAB_INFO, TAB_CONTRACTS, staged.tab.id, TAB_REVIEW]
    const currentIndex = order.indexOf(activeTab)
    const nextIndex = order.indexOf(nextTab)
    if (nextIndex < 0 || nextIndex === currentIndex) return
    if (nextIndex < currentIndex) {
      setActiveTab(nextTab)
      return
    }
    if (nextIndex > currentIndex && activeTab === TAB_INFO) {
      const headerIssues = validateRegister({ txnDate, paymentMethod, accountCode, rows: [] }).filter(
        (issue) => issue.fieldId !== "disburse-rows"
      )
      setIssues(headerIssues)
      if (headerIssues.length) {
        requestAnimationFrame(() => errorSummaryRef.current?.focus())
        return
      }
    }
    if (nextIndex > currentIndex && activeTab === TAB_CONTRACTS && !runValidation()) return
    if (shouldPersistRegisterDraft(Boolean(draftId), dirty)) {
      try {
        await persistDraft(activeTab === TAB_INFO)
      } catch {
        return
      }
    }
    setActiveTab(nextTab)
  }

  const submit = async () => {
    if (!runValidation()) return
    setSubmitting(true)
    try {
      const saved = await persistDraft()
      if (!saved.id || saved.version == null) throw new Error("Draft version is missing")
      const accepted = await disbursementBatchApi.submit(saved.id, saved.version)
      if (staged.ids.length) {
        sessionStorage.setItem(
          `${ATTACHMENT_IDS_KEY}:${saved.id}`,
          JSON.stringify(staged.ids)
        )
      }
      await queryClient.invalidateQueries()
      navigate(`/loans/disbursements/tracking/${encodeURIComponent(saved.id)}`, {
        state: { referenceNo: accepted.reference_no },
      })
    } catch (error) {
      notify.error(translateApiError(error, "loan.disbursements.batch.submit_failed"))
    } finally {
      setSubmitting(false)
      setSubmitConfirmOpen(false)
    }
  }

  const focusValidationIssue = (issue: RegisterValidationIssue) => {
    const targetTab = issue.fieldId === "disburse-rows" || issue.fieldId.startsWith("disburse-amount-")
      ? TAB_CONTRACTS
      : TAB_INFO
    const focusTarget = () => requestAnimationFrame(() => document.getElementById(issue.fieldId)?.focus())
    if (targetTab === activeTab) {
      focusTarget()
      return
    }
    void changeTab(targetTab).then(focusTarget)
  }

  const errorSummary = issues.length ? (
    <div ref={errorSummaryRef} tabIndex={-1} role="alert" className="rounded-md border border-destructive/50 bg-destructive/5 p-3">
      <p className="mb-2 text-sm font-semibold">{t("loan.disbursements.batch.validation_summary_title", { count: issues.length })}</p>
      <ul className="list-inside list-disc space-y-1 text-sm">
        {issues.map((issue) => (
          <li key={`${issue.fieldId}-${issue.messageKey}`}>
            <button
              type="button"
              className="text-left text-destructive underline underline-offset-2"
              onClick={() => focusValidationIssue(issue)}
            >
              {issue.row == null ? t(issue.messageKey) : t(issue.messageKey, { row: issue.row })}
            </button>
          </li>
        ))}
      </ul>
    </div>
  ) : null

  return (
    <>
    <PostingTabsShell
      labels={tabsLabels}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="shrink-0">{t("loan.batch.status_draft")}</Badge>
          {savedAt ? <span className="text-xs text-muted-foreground">{t("loan.disbursements.batch.saved_at", { time: savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })}</span> : null}
        </div>
      }
      value={activeTab}
      onValueChange={(value) => void changeTab(value)}
      banner={<>{resumeError ? <p className="rounded-md border border-destructive/50 p-3 text-sm text-destructive" role="alert">{t("loan.disbursements.batch.resume_failed")}</p> : null}{errorSummary}</>}
      tabs={[
        {
          id: TAB_INFO,
          label: t("loan.disbursements.batch.tab_info"),
          content: (
            <div className="grid items-start gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="disburse-date">
                      {t("loan.disbursements.batch.field.txn_date")}
                    </Label>
                    <Input
                      id="disburse-date"
                      type="date"
                      value={txnDate}
                      aria-invalid={issues.some((issue) => issue.fieldId === "disburse-date")}
                      onBlur={() => setIssues(validateRegister({ txnDate, paymentMethod, accountCode, rows: [] }).filter((issue) => issue.fieldId === "disburse-date"))}
                      onChange={(e) => { setTxnDate(e.target.value); setDirty(true) }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="disburse-method">
                      {t("loan.disbursements.batch.field.payment_method")}
                    </Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(value) => { setPaymentMethod(value as "TRANSFER" | "CASH"); setDirty(true) }}
                    >
                      <SelectTrigger id="disburse-method" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRANSFER">
                          {t("loan.disbursements.batch.payment.transfer")}
                        </SelectItem>
                        <SelectItem value="CASH">
                          {t("loan.disbursements.batch.payment.cash")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="disburse-account">
                      {t("loan.disbursements.batch.field.account_code")}
                    </Label>
                    <Input
                      id="disburse-account"
                      value={accountCode}
                      disabled={paymentMethod !== "TRANSFER"}
                      placeholder={
                        paymentMethod === "TRANSFER"
                          ? t("loan.disbursements.batch.placeholder.account_code")
                          : t("loan.disbursements.batch.placeholder.account_cash")
                      }
                      aria-invalid={issues.some((issue) => issue.fieldId === "disburse-account")}
                      onBlur={() => setIssues(validateRegister({ txnDate, paymentMethod, accountCode, rows: [] }).filter((issue) => issue.fieldId === "disburse-account"))}
                      onChange={(e) => { setAccountCode(e.target.value); setDirty(true) }}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5 md:col-span-3">
                    <Label htmlFor="disburse-description">{t("common.field.description")}</Label>
                    <Input
                      id="disburse-description"
                      value={shownDescription}
                      placeholder={autoDescription}
                      onChange={(e) => { setDescriptionOverride(e.target.value); setDirty(true) }}
                    />
                  </div>
                </div>
                <ObjectInfoCard
                  labels={objectLabels}
                  value={trader}
                  onChange={(value) => { setTrader(value); setDirty(true) }}
                  objectTypes={objectTypes}
                />
              </div>
              <ControlInfoCard
                labels={controlLabels}
                unit={unitName}
                status={t("loan.batch.status_draft")}
                enteredAt={todayISO()}
                enteredBy={user?.displayName || (user?.name ?? "")}
              />
            </div>
          ),
        },
        {
          id: TAB_CONTRACTS,
          label: t("loan.disbursements.batch.tab_contracts"),
          content: (
            <RegisterContractsTab
              rows={rows}
              pickerOpen={pickerOpen}
              onPickerOpenChange={setPickerOpen}
              onAddRows={addRows}
              onChangeRow={updateRow}
              onRemoveRow={removeRow}
              onRemoveGroup={removeGroup}
              rowIssues={issues}
              onValidateRow={validateRow}
            />
          ),
        },
        {
          ...staged.tab,
        },
        {
          id: TAB_REVIEW,
          label: t("loan.disbursements.batch.tab_review"),
          content: (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>{t("loan.disbursements.batch.review_header")}</CardTitle></CardHeader>
                <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                  <p>{t("loan.disbursements.batch.field.txn_date")}: <strong>{formatDateShort(txnDate)}</strong></p>
                  <p>{t("loan.disbursements.batch.field.payment_method")}: <strong>{t(`loan.disbursements.batch.payment.${paymentMethod.toLowerCase()}`)}</strong></p>
                  <p>{t("loan.disbursements.batch.review_contract_count", { count: rows.length })}</p>
                  <p>{t("loan.batch_grid.total_label")}: <strong>{formatAmount(fromMinor(totalMinor), "VND")}</strong></p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>{t("loan.disbursements.batch.tab_contracts")}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.key} className="flex flex-wrap justify-between gap-2 border-b pb-2 text-sm">
                      <span className="font-mono">{row.agreement.agreement_code}</span>
                      <span>{formatAmount(fromMinor(rowAmountMinor(row)), row.agreement.currency_code)}</span>
                      <span className="text-xs text-muted-foreground">
                        {previewQuery.data?.headroom.some((item) => item.contract_code === row.contract.contract_code)
                          ? t("loan.disbursements.batch.headroom_after", {
                              amount: formatAmount(
                                fromMinor(previewQuery.data.headroom.find((item) => item.contract_code === row.contract.contract_code)!.remaining_after_minor),
                                row.agreement.currency_code
                              ),
                            })
                          : "—"}
                      </span>
                      <Button type="button" variant="link" size="sm" onClick={() => void changeTab(TAB_CONTRACTS)}>{t("loan.disbursements.batch.change")}</Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>{t("loan.disbursements.batch.posting_preview")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {previewQuery.isPending ? <div className="space-y-2"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-4/5" /></div> : null}
                  {previewQuery.isError ? <div role="alert" className="space-y-2"><p className="text-sm text-destructive">{t("loan.disbursements.batch.posting_preview_failed")}</p><Button type="button" variant="outline" size="sm" onClick={() => void previewQuery.refetch()}>{t("common.action.retry")}</Button></div> : null}
                  {previewQuery.data ? <>
                    <p className={previewQuery.data.valid ? "text-sm text-emerald-700" : "text-sm text-destructive"}>
                      {t(previewQuery.data.valid ? "loan.disbursements.batch.posting_preview_valid" : "loan.disbursements.batch.posting_preview_invalid", { version: previewQuery.data.coa_version_id })}
                    </p>
                    {previewQuery.data.global_errors.map((error, index) => <p key={`${error}-${index}`} className="text-sm text-destructive">{error}</p>)}
                    <div className="divide-y rounded-md border">
                      {previewQuery.data.lines.map((line) => <div key={line.line_no} className="grid gap-1 p-2 text-sm sm:grid-cols-[auto_1fr_auto_auto]">
                        <span className="text-muted-foreground">{line.line_no}</span>
                        <span>{line.description || line.account_name || line.account_code}</span>
                        <span className="font-mono">{line.account_code}</span>
                        <span className="text-right tabular-nums">{line.direction} · {formatAmount(fromMinor(line.amount_minor), line.currency_code)}</span>
                        {line.errors.map((error, index) => <span key={`${error}-${index}`} className="text-destructive sm:col-span-4">{error}</span>)}
                      </div>)}
                    </div>
                  </> : null}
                </CardContent>
              </Card>
            </div>
          ),
        },
      ]}
      footer={
        <div className="flex items-center justify-between gap-2">
          <span id="disburse-rows" tabIndex={-1} className="text-sm text-muted-foreground">
            {t("loan.batch_grid.total_label")}:{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {formatAmount(fromMinor(totalMinor), "VND")}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => {
              if (shouldWarnRegisterExit(dirty || staged.ids.length > 0 || staged.uploading) && !window.confirm(t("loan.disbursements.batch.leave_unsaved"))) return
              navigate("/loans/disbursements")
            }}>
              {t("common.action.cancel")}
            </Button>
            {activeTab !== TAB_INFO ? <Button type="button" variant="outline" disabled={savePending || submitting} onClick={() => void changeTab([TAB_INFO, TAB_CONTRACTS, staged.tab.id, TAB_REVIEW][[TAB_INFO, TAB_CONTRACTS, staged.tab.id, TAB_REVIEW].indexOf(activeTab) - 1])}><ArrowLeft className="mr-1.5 size-4" />{t("common.action.prev")}</Button> : null}
            {activeTab !== TAB_REVIEW ? <Button type="button" disabled={savePending || submitting} onClick={() => void changeTab([TAB_INFO, TAB_CONTRACTS, staged.tab.id, TAB_REVIEW][[TAB_INFO, TAB_CONTRACTS, staged.tab.id, TAB_REVIEW].indexOf(activeTab) + 1])}>{savePending ? t("common.action.saving") : t("common.action.next")}<ArrowRight className="ml-1.5 size-4" /></Button> : <Button type="button" disabled={savePending || submitting} onClick={() => { if (runValidation()) setSubmitConfirmOpen(true) }}><Save className="mr-1.5 size-4" />{t("loan.disbursements.batch.submit")}</Button>}
          </div>
        </div>
      }
    />
    <AlertDialog open={submitConfirmOpen} onOpenChange={setSubmitConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("loan.disbursements.batch.confirm_title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("loan.disbursements.batch.confirm_description", { count: rows.length, amount: formatAmount(fromMinor(totalMinor), "VND") })}
            {" "}{t("loan.disbursements.batch.confirm_irreversible")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>{t("common.action.cancel")}</AlertDialogCancel>
          <AlertDialogAction disabled={submitting} onClick={(event) => { event.preventDefault(); void submit() }}>
            {submitting ? t("common.action.saving") : t("loan.disbursements.batch.confirm_submit")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
