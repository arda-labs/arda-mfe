import { useState } from "react"
import type { UseFormReturn } from "react-hook-form"
import { ScanLine } from "lucide-react"
import { DocumentScanDialog, useDocumentCapabilities, type CccdScanApply } from "@workspace/document-scan"
import { useI18n } from "@workspace/i18n"
import { uploadFile } from "@workspace/media"
import { Button } from "@workspace/ui/components/button"
import { notify } from "@workspace/ui/feedback/notify"
import { platformReferenceApi } from "../../api/platform-reference"
import type { CustomerFormValues } from "../schemas"
import { cccdFormPatch, existingFromForm } from "../utils/cccd-to-customer"
import { matchProvinceCode } from "../utils/province-match"

export function CccdScanButton({
  form,
  disabled,
  onImagesUploaded,
}: {
  form: UseFormReturn<CustomerFormValues>
  disabled?: boolean
  onImagesUploaded: (ids: string[]) => Promise<void>
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const capabilities = useDocumentCapabilities()
  if (!capabilities.data?.doc_types.includes("cccd")) return null

  async function apply(input: CccdScanApply) {
    const patch = cccdFormPatch(input, form.getValues())
    for (const [key, value] of Object.entries(patch) as [keyof CustomerFormValues, string][]) {
      form.setValue(key, value, { shouldDirty: true, shouldValidate: true })
    }
    let provinceSet = false
    if (input.values.residence) {
      try {
        const provinces = await platformReferenceApi.listGeoAdminUnits({ level: 1 })
        const code = matchProvinceCode(input.values.residence, provinces)
        if (code && code !== form.getValues("provinceCode")) {
          // GeoLocationFields clears ward/area when the province changes.
          form.setValue("provinceCode", code, { shouldDirty: true })
        }
        provinceSet = !!code
      } catch {
        provinceSet = false
      }
    }
    notify.success(t(provinceSet ? "crm.customers.cccd_scan.applied" : "crm.customers.cccd_scan.applied_province_missing"))

    try {
      const files = [new File([input.images.front], "cccd-mat-truoc.jpg", { type: "image/jpeg" })]
      if (input.images.back) files.push(new File([input.images.back], "cccd-mat-sau.jpg", { type: "image/jpeg" }))
      const uploaded = await Promise.all(files.map((f) => uploadFile(f, "crm", "", "")))
      await onImagesUploaded(uploaded.map((u) => u.public_id))
    } catch (error) {
      notify.error(t("crm.customers.cccd_scan.attach_failed"), error instanceof Error ? error.message : undefined)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <ScanLine className="size-4" />
        {t("crm.customers.cccd_scan.button")}
      </Button>
      <DocumentScanDialog
        open={open}
        onOpenChange={setOpen}
        modelLocation={capabilities.data.model_location}
        existing={open ? existingFromForm(form.getValues()) : {}}
        onApply={apply}
      />
    </>
  )
}
