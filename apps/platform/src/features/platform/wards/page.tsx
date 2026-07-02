import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { notify } from "@workspace/notifications/notify"
import { translateApiError } from "@workspace/i18n"
import { platformApi } from "../api"
import type { GeoAdminUnit } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { MaskInput } from "@workspace/ui/components/mask-input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
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
import { Edit2, Plus } from "lucide-react"

const wardFormSchema = z.object({
  code: z.string().trim().min(1, "Ma phuong xa la bat buoc").max(32, "Ma phuong xa qua dai"),
  name: z.string().trim().min(1, "Ten phuong xa la bat buoc").max(255, "Ten phuong xa qua dai"),
  full_name: z.string().trim().max(255, "Ten day du qua dai").optional(),
  parent_code: z.string().trim().min(1, "Tinh thanh la bat buoc"),
  unit_type: z.string().trim().min(1, "Loai don vi la bat buoc").max(64, "Loai don vi qua dai"),
  country_code: z.string().trim().min(1, "Ma quoc gia la bat buoc").max(8, "Ma quoc gia qua dai"),
  region_code: z.string().trim().max(32, "Ma vung qua dai").optional(),
  effective_from: z.string().trim().optional(),
  effective_to: z.string().trim().optional(),
})

type WardFormValues = z.infer<typeof wardFormSchema>

const wardDefaultValues: WardFormValues = {
  code: "",
  name: "",
  full_name: "",
  parent_code: "",
  unit_type: "ward",
  country_code: "VN",
  region_code: "",
  effective_from: "",
  effective_to: "",
}

function toWardFormValues(item: GeoAdminUnit): WardFormValues {
  return {
    code: item.code,
    name: item.name,
    full_name: item.full_name || "",
    parent_code: item.parent_code || "",
    unit_type: item.unit_type || "ward",
    country_code: item.country_code || "VN",
    region_code: item.region_code || "",
    effective_from: item.effective_from || "",
    effective_to: item.effective_to || "",
  }
}

export function WardsPage() {
  const [items, setItems] = useState<GeoAdminUnit[]>([])
  const [provinces, setProvinces] = useState<GeoAdminUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProvince, setSelectedProvince] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<GeoAdminUnit | null>(null)
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<WardFormValues>({
    resolver: zodResolver(wardFormSchema),
    defaultValues: wardDefaultValues,
  })

  const load = async () => {
    setLoading(true)
    try {
      const provinceData = await platformApi.listGeoAdminUnits(undefined, 1)
      setProvinces(provinceData)
      setItems(
        selectedProvince === "all"
          ? await platformApi.listGeoAdminUnits(undefined, 2)
          : await platformApi.listGeoAdminUnits(selectedProvince, 2)
      )
    } catch (err) {
      notify.error("Khong the tai danh sach phuong xa", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [selectedProvince])

  const openCreate = () => {
    setEditingItem(null)
    reset({
      ...wardDefaultValues,
      parent_code: selectedProvince === "all" ? "" : selectedProvince,
    })
    setDialogOpen(true)
  }

  const openEdit = (item: GeoAdminUnit) => {
    setEditingItem(item)
    reset(toWardFormValues(item))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingItem(null)
      reset(wardDefaultValues)
    }
  }

  const submitWard = handleSubmit(async (values) => {
    try {
      await platformApi.upsertGeoAdminUnit({
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        full_name: values.full_name?.trim() || undefined,
        parent_code: values.parent_code,
        level: 2,
        unit_type: values.unit_type.trim(),
        country_code: values.country_code.trim().toUpperCase() || "VN",
        region_code: values.region_code?.trim() || undefined,
        effective_from: values.effective_from || undefined,
        effective_to: values.effective_to || undefined,
        is_active: true,
      })
      notify.success(editingItem ? "Cap nhat phuong xa thanh cong" : "Them phuong xa thanh cong")
      setDialogOpen(false)
      reset(wardDefaultValues)
      await load()
    } catch (err) {
      notify.error("Luu phuong xa that bai", translateApiError(err))
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Phuong xa</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
            Tong so: {items.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 font-semibold">
          <Plus className="size-4" /> Them phuong xa
        </Button>
      </div>

      <Card className="rounded-2xl border-muted/50 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="w-full md:w-80">
              <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                <SelectTrigger>
                  <SelectValue placeholder="Chon tinh thanh" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tat ca tinh thanh</SelectItem>
                  {provinces.map((province) => (
                    <SelectItem key={province.code} value={province.code}>
                      {province.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Dang tai du lieu phuong xa...
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-muted/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Ma</TableHead>
                    <TableHead>Ten phuong xa</TableHead>
                    <TableHead>Tinh thanh</TableHead>
                    <TableHead>Loai don vi</TableHead>
                    <TableHead>Hieu luc tu</TableHead>
                    <TableHead className="text-right">Thao tac</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Chua co phuong xa nao.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.code}>
                        <TableCell className="font-mono text-xs">{item.code}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.full_name || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {provinces.find((province) => province.code === item.parent_code)?.name ||
                            item.parent_code ||
                            "-"}
                        </TableCell>
                        <TableCell>{item.unit_type}</TableCell>
                        <TableCell>{item.effective_from || "-"}</TableCell>
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
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Cap nhat phuong xa" : "Them phuong xa"}</DialogTitle>
            <DialogDescription>Quan ly don vi dia gioi hanh chinh cap phuong/xa.</DialogDescription>
          </DialogHeader>
          <form autoComplete="off" onSubmit={submitWard} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Ma phuong xa" htmlFor="ward_code" error={errors.code?.message}>
                <Input id="ward_code" aria-invalid={Boolean(errors.code)} disabled={!!editingItem} {...register("code")} />
              </FormField>
              <FormField label="Ten phuong xa" htmlFor="ward_name" error={errors.name?.message}>
                <Input id="ward_name" aria-invalid={Boolean(errors.name)} {...register("name")} />
              </FormField>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField className="md:col-span-2" label="Ten day du" htmlFor="ward_full_name" error={errors.full_name?.message}>
                <Input id="ward_full_name" aria-invalid={Boolean(errors.full_name)} {...register("full_name")} />
              </FormField>
              <FormField label="Tinh thanh" htmlFor="ward_parent" error={errors.parent_code?.message}>
                <Controller
                  control={control}
                  name="parent_code"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="ward_parent" aria-invalid={Boolean(errors.parent_code)}>
                        <SelectValue placeholder="Chon tinh thanh" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinces.map((province) => (
                          <SelectItem key={province.code} value={province.code}>
                            {province.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <FormField label="Loai don vi" htmlFor="ward_unit_type" error={errors.unit_type?.message}>
                <Input id="ward_unit_type" aria-invalid={Boolean(errors.unit_type)} {...register("unit_type")} />
              </FormField>
              <FormField label="Ma vung" htmlFor="ward_region_code" error={errors.region_code?.message}>
                <Input id="ward_region_code" aria-invalid={Boolean(errors.region_code)} {...register("region_code")} />
              </FormField>
              <FormField label="Hieu luc tu (MM/DD/YYYY)" htmlFor="ward_effective_from" error={errors.effective_from?.message}>
                <Controller
                  control={control}
                  name="effective_from"
                  render={({ field }) => (
                    <MaskInput
                      id="ward_effective_from"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
              <FormField label="Hieu luc den (MM/DD/YYYY)" htmlFor="ward_effective_to" error={errors.effective_to?.message}>
                <Controller
                  control={control}
                  name="effective_to"
                  render={({ field }) => (
                    <MaskInput
                      id="ward_effective_to"
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Dang luu..." : "Luu lai"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
