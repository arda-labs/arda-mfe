import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useI18n } from "@workspace/i18n"
import { Plus, Save, Send, X } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { CurrentTaskPanel } from "../components/task-panel"
import { GeoLocationFields } from "../geo-location-fields"
import { OrgUnitField } from "../org-unit-field"
import {
  useCancelAmendment,
  useCompleteWorkflowTask,
  useCurrentAmendment,
  useCustomer,
  useStartAdjustment,
  useSubmitAmendment,
  useUpdateAmendment,
} from "../queries"
import {
  businessFields,
  customerSchema,
  defaultValues,
  extendedFields,
  generalFieldsPrimary,
  generalFieldsRest,
  personalFields,
  type CustomerFormValues,
} from "../shared/schemas"
import {
  computeChangedFields,
  customerTypeLabel,
  toAmendmentSnapshot,
  toFormValues,
} from "../shared/form-utils"
import {
  hasTaskContext,
  resolveWorkflowJobKey,
  taskContextFromSearch,
} from "../shared/task-context"
import {
  EmptyState,
  FieldGrid,
  Header,
  Panel,
  RegistrationMetaBar,
  StatusBadge,
} from "../shared/ui"

export function CustomerAdjustmentPage({
  initialCustomerId,
}: {
  initialCustomerId?: string | null
}) {
  const { t } = useI18n()
  const customerId = initialCustomerId?.trim() || ""
  const taskContext = taskContextFromSearch()
  const customerQuery = useCustomer(customerId || null)
  const amendmentQuery = useCurrentAmendment(customerId || null)
  const startAdjustment = useStartAdjustment()
  const updateAmendment = useUpdateAmendment(customerId)
  const submitAmendment = useSubmitAmendment(customerId)
  const cancelAmendment = useCancelAmendment(customerId)
  const completeTask = useCompleteWorkflowTask(taskContext.role)
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues,
  })
  const customer = customerQuery.data ?? null
  const amendment = amendmentQuery.data ?? null
  const customerType = form.watch("customerType")
  const isPersonal = customerType === "PERSONAL"
  const readOnly = amendment?.status === "PENDING"
  const canEdit = amendment?.status === "DRAFT"
  const canSubmit = canEdit && Boolean(amendment?.id)
  const canCancelDraft = canEdit && Boolean(amendment?.id)
  const canStart =
    Boolean(customerId) &&
    customer?.status === "ACTIVE" &&
    !amendment &&
    !amendmentQuery.isFetching
  const awaitingAmendmentResubmit =
    amendment?.status === "DRAFT" && hasTaskContext(taskContext)

  useEffect(() => {
    if (!customer) return
    form.reset(toFormValues(customer))
  }, [customer, form])

  async function saveAdjustment(values: CustomerFormValues) {
    if (!amendment?.id) return
    const afterSnapshot = toAmendmentSnapshot(values)
    await updateAmendment.mutateAsync({
      amendmentId: amendment.id,
      payload: {
        afterSnapshot,
        changedFields: computeChangedFields(customer, afterSnapshot),
      },
    })
  }

  async function completeCurrentTask(decision: string) {
    const resolved = await resolveWorkflowJobKey(taskContext, customer?.status)
    if (!resolved) return
    const variables =
      resolved.role === "CUSTOMER_RISK_CHECKER"
        ? { riskDecision: decision }
        : resolved.role === "CUSTOMER_MAKER"
          ? { revisionSubmitted: true }
          : { reviewDecision: decision }
    completeTask.mutate({
      jobKey: resolved.jobKey,
      processInstanceKey: resolved.processInstanceKey,
      elementId: resolved.elementId,
      variables,
    })
  }

  if (!customerId) {
    return (
      <section className="space-y-4">
        <Header
          title={t("crm.customers.adjustments.title")}
          description={t("crm.customers.adjustments.description")}
        />
        <EmptyState text="Thiếu customerId trên URL." />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <Header
        title={t("crm.customers.adjustments.title")}
        description={t("crm.customers.adjustments.description")}
      />
      {customerQuery.isFetching || amendmentQuery.isFetching ? (
        <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">
          Đang tải hồ sơ...
        </div>
      ) : null}
      {customer ? <RegistrationMetaBar customer={customer} /> : null}
      {amendment ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-3 text-sm">
          <span>
            Phiên điều chỉnh:{" "}
            <span className="font-mono font-medium">{amendment.id}</span>
          </span>
          <StatusBadge status={amendment.status} />
          {amendment.changedFields?.length ? (
            <span className="text-muted-foreground">
              Trường đổi: {amendment.changedFields.join(", ")}
            </span>
          ) : null}
        </div>
      ) : null}
      {awaitingAmendmentResubmit ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("crm.customers.adjustments.resubmit_banner")}
        </div>
      ) : null}
      {readOnly ? (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {t("crm.customers.adjustments.pending_banner")}
        </div>
      ) : null}
      <CurrentTaskPanel
        context={taskContext}
        completing={completeTask.isPending}
        onComplete={completeCurrentTask}
      />
      {canStart ? (
        <div className="flex justify-end">
          <Button
            type="button"
            disabled={startAdjustment.isPending}
            onClick={() => startAdjustment.mutate(customerId)}
          >
            <Plus className="size-4" />
            {t("crm.customers.adjustments.start")}
          </Button>
        </div>
      ) : null}
      {amendment ? (
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveAdjustment(values))}
        >
          <Tabs defaultValue="general" className="space-y-4">
            <TabsList>
              <TabsTrigger value="general">Thông tin khách hàng</TabsTrigger>
            </TabsList>
            <TabsContent value="general" className="space-y-4">
              <Panel title="Thông tin chung">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <FormField label="Loại khách hàng">
                    <Input value={customerTypeLabel(customerType)} readOnly />
                  </FormField>
                  <OrgUnitField form={form} disabled={readOnly} />
                  <FieldGrid fields={generalFieldsPrimary} form={form} bare />
                  <GeoLocationFields form={form} />
                  <FieldGrid fields={generalFieldsRest} form={form} bare />
                </div>
              </Panel>
              {isPersonal ? (
                <>
                  <Panel title="Thông tin định danh">
                    <FieldGrid fields={personalFields} form={form} />
                  </Panel>
                  <Panel title="Thông tin mở rộng">
                    <FieldGrid fields={extendedFields} form={form} />
                  </Panel>
                </>
              ) : (
                <Panel title="Thông tin doanh nghiệp">
                  <FieldGrid fields={businessFields} form={form} />
                </Panel>
              )}
            </TabsContent>
          </Tabs>
          <fieldset disabled={readOnly} className="space-y-0">
            <div className="flex flex-wrap justify-end gap-2">
              {customer ? <StatusBadge status={customer.status} /> : null}
              <Button
                type="submit"
                disabled={!canEdit || updateAmendment.isPending}
              >
                <Save className="size-4" />
                {t("crm.customers.adjustments.save")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!canSubmit || submitAmendment.isPending}
                onClick={form.handleSubmit(async (values) => {
                  await saveAdjustment(values)
                  if (!amendment?.id) return
                  await submitAmendment.mutateAsync(amendment.id)
                })}
              >
                <Send className="size-4" />
                {t("crm.customers.adjustments.submit")}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!canCancelDraft || cancelAmendment.isPending}
                onClick={() => {
                  if (!amendment?.id) return
                  cancelAmendment.mutate(amendment.id)
                }}
              >
                <X className="size-4" />
                {t("crm.customers.adjustments.cancel_draft")}
              </Button>
            </div>
          </fieldset>
        </form>
      ) : null}
    </section>
  )
}
