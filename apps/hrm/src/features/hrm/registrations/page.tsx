import { useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { PageTitle as CollapsingPageTitle } from "@workspace/ui/components/page-title"
import { Tabs, TabsContent } from "@workspace/ui/components/tabs"
import { Plus, Send } from "lucide-react"
import type { EmployeeRegistration } from "../api"
import {
  useCreateEmployeeRegistration,
  useOrgUnits,
  usePositions,
  useSubmitEmployeeRegistration,
  useUpdateEmployeeRegistration,
  useUploadEmployeeAvatar,
} from "../queries"
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
  const orgUnits = useOrgUnits()
  const positions = usePositions()
  const createRegistration = useCreateEmployeeRegistration()
  const updateRegistration = useUpdateEmployeeRegistration()
  const submitRegistration = useSubmitEmployeeRegistration()
  const uploadAvatar = useUploadEmployeeAvatar()
  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: registrationDefaults,
  })
  const avatarFileId = useWatch({ control: form.control, name: "avatar_file_id" })

  const resetDraft = () => {
    setSavedRegistration(null)
    form.reset(registrationDefaults)
  }

  async function save(values: RegistrationValues, submitNow = false) {
    const payload = toRegistrationPayload(values)
    let current = savedRegistration
    if (!current) {
      current = await createRegistration.mutateAsync({ payload })
    } else if (current.status === "draft") {
      current = await updateRegistration.mutateAsync({ id: current.id, payload })
    }
    setSavedRegistration(current)
    form.reset(values)
    if (submitNow && current.status === "draft") {
      const submitted = await submitRegistration.mutateAsync(current.id)
      setSavedRegistration(submitted)
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
    const result = await uploadAvatar.mutateAsync({ file, registrationCode })
    form.setValue("avatar_file_id", result.public_id, { shouldDirty: true })
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit((values) => save(values))}>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-gutter:stable]">
          <RegistrationMetaBar registration={savedRegistration} />
          <Tabs defaultValue="general" className="space-y-4">
            <CollapsingPageTitle
              title="Đăng ký nhân sự"
              description="Nhập hồ sơ nhân sự và trình duyệt theo quy trình BPM HRM_EMPLOYEE_REGISTRATION."
              collapsedContent={<RegistrationTabsList compact />}
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
            >
              <RegistrationTabsList />
            </CollapsingPageTitle>
            <TabsContent value="general" className="mt-0 space-y-4">
              <RegistrationGeneralPanel
                avatarFileId={avatarFileId ?? ""}
                form={form}
                orgUnits={orgUnits.data ?? []}
                uploadingAvatar={uploadAvatar.isPending}
                onClearAvatar={() => form.setValue("avatar_file_id", "", { shouldDirty: true })}
                onUploadAvatar={uploadAvatarFile}
              />
              <AssignmentsTable form={form} orgUnits={orgUnits.data ?? []} positions={positions.data ?? []} />
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
          </Tabs>
        </div>
        <div className="flex h-[52px] shrink-0 items-center border-t bg-background px-4">
          <div className="flex w-full flex-wrap justify-end gap-2">
            <Button
              className="h-8"
              type="submit"
              disabled={
                form.formState.isSubmitting ||
                createRegistration.isPending ||
                updateRegistration.isPending ||
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
                createRegistration.isPending ||
                updateRegistration.isPending ||
                submitRegistration.isPending
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
