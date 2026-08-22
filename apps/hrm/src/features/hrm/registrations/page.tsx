import { useCallback, useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { translateApiError } from "@workspace/i18n"
import { uploadFile } from "@workspace/media"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PageTitle as CollapsingPageTitle } from "@workspace/ui/components/page-title"
import { Tabs, TabsContent } from "@workspace/ui/components/tabs"
import { Plus, Send } from "lucide-react"
import { hrmApi, type EmployeeRegistration, type OrgUnit, type Position } from "../api"
import {
  registrationDefaults,
  registrationSchema,
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
  const [savedRegistration, setSavedRegistration] = useState<EmployeeRegistration | null>(null)
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: registrationDefaults,
  })
  const avatarFileId = useWatch({ control: form.control, name: "avatar_file_id" })

  const load = useCallback(async () => {
    try {
      const [units, pos] = await Promise.all([
        hrmApi.listOrgUnits(),
        hrmApi.listPositions(),
      ])
      setOrgUnits(units)
      setPositions(pos)
    } catch {
      notify.error("Khong the tai danh sach don vi hoac chuc vu")
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
        notify.success("Da tao dang ky nhan su")
      } else if (current.status === "draft") {
        current = await hrmApi.updateEmployeeRegistration(current.id, payload)
        notify.success("Da luu dang ky nhan su")
      }
      setSavedRegistration(current)
      form.reset(values)
      if (submitNow && current && current.status === "draft") {
        setSaving(false)
        setSubmitting(true)
        try {
          const submitted = await hrmApi.submitEmployeeRegistration(current.id)
          notify.success("Da gui dang ky nhan su")
          setSavedRegistration(submitted)
        } catch (reason) {
          notify.error("Gui dang ky nhan su that bai", translateApiError(reason))
        } finally {
          setSubmitting(false)
        }
        return
      }
    } catch (reason) {
      if (!savedRegistration) {
        notify.error("Tao dang ky nhan su that bai", translateApiError(reason))
      } else {
        notify.error("Luu dang ky nhan su that bai", translateApiError(reason))
      }
    } finally {
      setSaving(false)
    }
  }

  async function uploadAvatarFile(file: File) {
    if (!savedRegistration?.id) {
      notify.error("Lưu nháp hồ sơ trước khi upload ảnh đại diện")
      return
    }
    if (!file.type.startsWith("image/")) {
      notify.error("File ảnh không hợp lệ")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      notify.error("Ảnh đại diện tối đa 5MB")
      return
    }
    const registrationCode = savedRegistration.registration_code
    setUploadingAvatar(true)
    try {
      const result = await uploadFile(file, "hrm", "employee_avatar", registrationCode)
      notify.success("Đã tải ảnh đại diện lên media-service")
      form.setValue("avatar_file_id", result.public_id, { shouldDirty: true })
    } catch (reason) {
      notify.error(
        "Tải ảnh đại diện thất bại",
        reason instanceof Error ? reason.message : undefined
      )
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit((values) => save(values))}>
        <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
          <div className="space-y-4 p-4 pb-3">
            <RegistrationMetaBar registration={savedRegistration} />
            <CollapsingPageTitle
              title="Đăng ký nhân sự"
              description="Nhập hồ sơ nhân sự và trình duyệt theo quy trình BPM HRM_EMPLOYEE_REGISTRATION."
              meta={
                <>
                  {savedRegistration ? (
                    <Badge className="shrink-0" variant="secondary">
                      {registrationStatusLabel(savedRegistration.status)}
                    </Badge>
                  ) : null}
                  {savedRegistration?.workflow_case_id ? (
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      Workflow case: {savedRegistration.workflow_case_id}
                    </span>
                  ) : null}
                </>
              }
              actions={
                savedRegistration ? (
                  <Button className="h-8" type="button" variant="outline" onClick={resetDraft}>
                    <Plus className="size-4" />
                    Hồ sơ mới
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
                  onClearAvatar={() => form.setValue("avatar_file_id", "", { shouldDirty: true })}
                  onUploadAvatar={uploadAvatarFile}
                />
                <AssignmentsTable form={form} orgUnits={orgUnits} positions={positions} />
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
                (savedRegistration !== null && savedRegistration.status !== "draft")
              }
            >
              Lưu nháp
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
              Trình duyệt
            </Button>
          </div>
        </div>
      </form>
    </section>
  )
}