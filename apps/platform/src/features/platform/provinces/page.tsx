import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { notify } from "@workspace/notifications/notify"
import { translateApiError } from "@workspace/i18n"
import type { GeoAdminUnit } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { MaskInput } from "@workspace/ui/components/mask-input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Edit2, Plus } from "lucide-react"
import { useProvinces, useUpsertProvince } from "./queries"

const provinceFormSchema = z.object({
  code: z.string().trim().min(1, "Ma tinh thanh la bat buoc").max(32, "Ma tinh thanh qua dai"),
  name: z.string().trim().min(1, "Ten tinh thanh la bat buoc").max(255, "Ten tinh thanh qua dai"),
  full_name: z.string().trim().max(255, "Ten day du qua dai").optional(),
  unit_type: z.string().trim().min(1, "Loai don vi la bat buoc").max(64, "Loai don vi qua dai"),
  country_code: z.string().trim().min(1, "Ma quoc gia la bat buoc").max(8, "Ma quoc gia qua dai"),
  region_code: z.string().trim().max(32, "Ma vung qua dai").optional(),
  effective_from: z.string().trim().optional(),
  effective_to: z.string().trim().optional(),
})

type ProvinceFormValues = z.infer<typeof provinceFormSchema>

const provinceDefaultValues: ProvinceFormValues = {
  code: "",
  name: "",
  full_name: "",
  unit_type: "province",
  country_code: "VN",
  region_code: "",
  effective_from: "",
  effective_to: "",
}

function toProvinceFormValues(item: GeoAdminUnit): ProvinceFormValues {
  return {
    code: item.code,
    name: item.name,
    full_name: item.full_name || "",
    unit_type: item.unit_type || "province",
    country_code: item.country_code || "VN",
    region_code: item.region_code || "",
    effective_from: item.effective_from || "",
    effective_to: item.effective_to || "",
  }
}

export function ProvincesPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GeoAdminUnit | null>(null)
  const provincesQuery = useProvinces()
  const upsertProvince = useUpsertProvince(Boolean(editingItem))
  const items = provincesQuery.data ?? []
  const loading = provincesQuery.isLoading
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<ProvinceFormValues>({
    resolver: zodResolver(provinceFormSchema),
    defaultValues: provinceDefaultValues,
  })

  useEffect(() => {
    if (provincesQuery.error) {
      notify.error("Khong the tai danh sach tinh thanh", translateApiError(provincesQuery.error))
    }
  }, [provincesQuery.error])

  const openCreate = () => {
    setEditingItem(null)
    reset(provinceDefaultValues)
    setDialogOpen(true)
  }

  const openEdit = (item: GeoAdminUnit) => {
    setEditingItem(item)
    reset(toProvinceFormValues(item))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingItem(null)
      reset(provinceDefaultValues)
    }
  }

  const submitProvince = handleSubmit(async (values) => {
    try {
      await upsertProvince.mutateAsync({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        full_name: values.full_name?.trim() || undefined,
        level: 1,
        unit_type: values.unit_type.trim(),
        country_code: values.country_code.trim().toUpperCase() || "VN",
        region_code: values.region_code?.trim() || undefined,
        effective_from: values.effective_from || undefined,
        effective_to: values.effective_to || undefined,
        is_active: true,
      })
      setDialogOpen(false)
      reset(provinceDefaultValues)
    } catch {
      // Mutation hook already shows the save error toast.
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Tinh thanh</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
            Tong so: {items.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 font-semibold">
          <Plus className="size-4" /> Them tinh thanh
        </Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-muted/50 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Dang tai du lieu tinh thanh...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Ma</TableHead>
                  <TableHead>Ten tinh thanh</TableHead>
                  <TableHead>Ten day du</TableHead>
                  <TableHead>Loai don vi</TableHead>
                  <TableHead>Vung</TableHead>
                  <TableHead>Hieu luc</TableHead>
                  <TableHead className="text-right">Thao tac</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      Chua co tinh thanh nao.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.code}>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.full_name || "-"}</TableCell>
                      <TableCell>{item.unit_type}</TableCell>
                      <TableCell>{item.region_code || "-"}</TableCell>
                      <TableCell>
                        <Status variant="success">
                          <StatusIndicator />
                          <StatusLabel>{item.effective_from || "Dang hieu luc"}</StatusLabel>
                        </Status>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(item)}>
                          <Edit2 className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Cap nhat tinh thanh" : "Them tinh thanh"}</DialogTitle>
            <DialogDescription>Quan ly don vi dia gioi hanh chinh cap tinh/thanh.</DialogDescription>
          </DialogHeader>
          <form autoComplete="off" onSubmit={submitProvince} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Ma tinh thanh" htmlFor="province_code" error={errors.code?.message}>
                <Input
                  id="province_code"
                  aria-invalid={Boolean(errors.code)}
                  disabled={!!editingItem}
                  {...register("code")}
                />
              </FormField>
              <FormField label="Ten tinh thanh" htmlFor="province_name" error={errors.name?.message}>
                <Input id="province_name" aria-invalid={Boolean(errors.name)} {...register("name")} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                className="md:col-span-2"
                label="Ten day du"
                htmlFor="province_full_name"
                error={errors.full_name?.message}
              >
                <Input id="province_full_name" aria-invalid={Boolean(errors.full_name)} {...register("full_name")} />
              </FormField>
              <FormField label="Loai don vi" htmlFor="province_unit_type" error={errors.unit_type?.message}>
                <Input id="province_unit_type" aria-invalid={Boolean(errors.unit_type)} {...register("unit_type")} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <FormField label="Ma quoc gia" htmlFor="province_country" error={errors.country_code?.message}>
                <Input id="province_country" aria-invalid={Boolean(errors.country_code)} {...register("country_code")} />
              </FormField>
              <FormField label="Ma vung" htmlFor="province_region" error={errors.region_code?.message}>
                <Input id="province_region" aria-invalid={Boolean(errors.region_code)} {...register("region_code")} />
              </FormField>
              <FormField
                label="Hieu luc tu (MM/DD/YYYY)"
                htmlFor="province_effective_from"
                error={errors.effective_from?.message}
              >
                <Controller
                  control={control}
                  name="effective_from"
                  render={({ field }) => (
                    <MaskInput
                      id="province_effective_from"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
              <FormField
                label="Hieu luc den (MM/DD/YYYY)"
                htmlFor="province_effective_to"
                error={errors.effective_to?.message}
              >
                <Controller
                  control={control}
                  name="effective_to"
                  render={({ field }) => (
                    <MaskInput
                      id="province_effective_to"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
            </div>
            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleDialogOpenChange(false)}>
                Huy
              </Button>
              <Button type="submit" disabled={isSubmitting || upsertProvince.isPending}>
                {isSubmitting || upsertProvince.isPending ? "Dang luu..." : "Luu lai"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
