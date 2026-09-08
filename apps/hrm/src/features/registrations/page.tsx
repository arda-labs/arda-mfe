import { useCallback, useEffect, useMemo, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { uploadFile } from "@workspace/media"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PageTitle as CollapsingPageTitle } from "@workspace/ui/components/page-title"
import { Tabs, TabsContent } from "@workspace/ui/components/tabs"
import { Plus, Send } from "lucide-react"
import {
  hrmApi,
  type EmployeeRegistration,
  type OrgUnit,
  type Position,
} from "../api"
import {
  buildRegistrationSchema,
  registrationDefaults,
  type RegistrationValues,
} from "../shared/schemas"
import {
  AssignmentsTable,
  AttachmentsTable,
  DelegationsTable,
  EducationsTable,
  FamilyTable,
  RegistrationGeneralPanel,
  RegistrationMetaBar,
  RegistrationTabsList,
  registrationStatusLabel,
  toRegistrationPayload,
} from "../shared/ui"

export function RegistrationsPage() {
  const { t } = useI18n()
  const [savedRegistration, setSavedRegistration] =
    useState<EmployeeRegistration | null>(null)
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const registrationSchema = useMemo(
    () => buildRegistrationSchema(t),
    [t]
  )
  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: registrationDefaults,
  })
  const avatarFileId = useWatch({
    control: form.control,
    name: "avatar_file_id",
  })

  const load = useCallback(async () => {
    try {
      const [units, pos] = await Promise.all([
        hrmApi.listOrgUnits(),
        hrmApi.listPositions(),
      ])
      setOrgUnits(units)
      setPositions(pos)
    } catch {
      notify.error(t("hrm.registrations.load_failed"))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resetDraft = () => {
    setSavedRegistration(null)
    form.reset(registrationDefaults)
  }

  async function save(values: RegistrationValues, submitNow = false) {
    const payload = toRegistrationPayload(values)
    setSaving(true)
    try {
      let current = savedRegistration
      if (!current) {
        current = await hrmApi.createEmployeeRegistration({ payload })
        notify.success(t("hrm.registrations.create_success"))
      } else if (current.status === "draft") {
        current = await hrmApi.updateEmployeeRegistration(current.id, payload)
        notify.success(t("hrm.registrations.update_success"))
      }
      setSavedRegistration(current)
      form.reset(values)
      if (submitNow && current && current.status === "draft") {
        setSaving(false)
        setSubmitting(true)
        try {
          const submitted = await hrmApi.submitEmployeeRegistration(current.id)
          notify.success(t("hrm.registrations.submit_success"))
          setSavedRegistration(submitted)
        } catch (reason) {
          notify.error(
            t("hrm.registrations.submit_failed"),
            translateApiError(reason)
          )
        } finally {
          setSubmitting(false)
        }
        return
      }
    } catch (reason) {
      if (!savedRegistration) {
        notify.error(
          t("hrm.registrations.create_failed"),
          translateApiError(reason)
        )
      } else {
        notify.error(
          t("hrm.registrations.update_failed"),
          translateApiError(reason)
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function uploadAvatarFile(file: File) {
    if (!savedRegistration?.id) {
      notify.error(t("hrm.registrations.avatar.save_first"))
      return
    }
    if (!file.type.startsWith("image/")) {
      notify.error(t("hrm.registrations.avatar.invalid_file"))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error(t("hrm.registrations.avatar.too_large"))
      return
    }
    const registrationCode = savedRegistration.registration_code
    setUploadingAvatar(true)
    try {
      const result = await uploadFile(
        file,
        "hrm",
        "employee_avatar",
        registrationCode
      )
      notify.success(t("hrm.registrations.avatar.upload_success"))
      form.setValue("avatar_file_id", result.public_id, { shouldDirty: true })
    } catch (reason) {
      notify.error(
        t("hrm.registrations.avatar.upload_failed"),
        reason instanceof Error ? reason.message : undefined
      )
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={form.handleSubmit((values) => save(values))}
      >
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          <div className="space-y-4 p-4 pb-3">
            <RegistrationMetaBar registration={savedRegistration} />
            <CollapsingPageTitle
              title={t("hrm.registrations.title")}
              description={t("hrm.registrations.description")}
              meta={
                <>
                  {savedRegistration ? (
                    <Badge className="shrink-0" variant="secondary">
                      {registrationStatusLabel(savedRegistration.status, t)}
                    </Badge>
                  ) : null}
                  {savedRegistration?.workflow_case_id ? (
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {t("hrm.registrations.meta.workflow_case")}{" "}
                      {savedRegistration.workflow_case_id}
                    </span>
                  ) : null}
                </>
              }
              actions={
                savedRegistration ? (
                  <Button
                    className="h-8"
                    type="button"
                    variant="outline"
                    onClick={resetDraft}
                  >
                    <Plus className="size-4" />
                    {t("hrm.registrations.actions.new_profile")}
                  </Button>
                ) : null
              }
            />
          </div>
          <Tabs defaultValue="general" className="flex flex-col">
            <div className="sticky top-0 z-10 border-b bg-background px-4 py-2">
              <RegistrationTabsList />
            </div>
            <div className="space-y-4 p-4">
              <TabsContent value="general" className="mt-0 space-y-4">
                <RegistrationGeneralPanel
                  avatarFileId={avatarFileId ?? ""}
                  form={form}
                  orgUnits={orgUnits}
                  uploadingAvatar={uploadingAvatar}
                  onClearAvatar={() =>
                    form.setValue("avatar_file_id", "", { shouldDirty: true })
                  }
                  onUploadAvatar={uploadAvatarFile}
                />
                <AssignmentsTable
                  form={form}
                  orgUnits={orgUnits}
                  positions={positions}
                />
                <EducationsTable form={form} />
              </TabsContent>
              <TabsContent value="family" className="mt-0">
                <FamilyTable form={form} />
              </TabsContent>
              <TabsContent value="delegation" className="mt-0">
                <DelegationsTable form={form} />
              </TabsContent>
              <TabsContent value="attachments" className="mt-0">
                <AttachmentsTable form={form} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
        <div className="flex h-[52px] shrink-0 items-center border-t bg-background px-4">
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button
              className="h-8"
              type="submit"
              disabled={
                form.formState.isSubmitting ||
                saving ||
                submitting ||
                (savedRegistration !== null &&
                  savedRegistration.status !== "draft")
              }
            >
              {t("hrm.registrations.actions.save_draft")}
            </Button>
            <Button
              className="h-8"
              type="button"
              variant="secondary"
              disabled={
                !savedRegistration?.id ||
                savedRegistration.status !== "draft" ||
                form.formState.isSubmitting ||
                saving ||
                submitting
              }
              onClick={form.handleSubmit((values) => save(values, true))}
            >
              <Send className="size-4" />
              {t("hrm.registrations.actions.submit")}
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}
