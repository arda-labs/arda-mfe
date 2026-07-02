import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
import { platformApi } from "../api"
import type { CreditInstitution } from "../api"
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
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
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
import { Textarea } from "@workspace/ui/components/textarea"
import { Edit2, Plus, Search, Trash2 } from "lucide-react"

const STATUS_OPTIONS = [
  { value: "all", label: "Tat ca" },
  { value: "active", label: "Hoat dong" },
  { value: "inactive", label: "Ngung hieu luc" },
] as const

const optionalEmailSchema = z.union([
  z.literal(""),
  z.string().trim().email("Email khong hop le"),
])

const optionalUrlSchema = z.union([
  z.literal(""),
  z.string().trim().url("Website khong hop le"),
])

const creditInstitutionFormSchema = z.object({
  code: z.string().trim().min(1, "Ma to chuc la bat buoc").max(64, "Ma to chuc qua dai"),
  name: z.string().trim().min(1, "Ten to chuc la bat buoc").max(255, "Ten to chuc qua dai"),
  address: z.string().trim().min(1, "Dia chi la bat buoc").max(500, "Dia chi qua dai"),
  status: z.enum(["active", "inactive"]),
  effective_from: z.string().trim().optional(),
  short_name: z.string().trim().max(128, "Ten viet tat qua dai").optional(),
  phone: z.string().trim().max(32, "So dien thoai qua dai").optional(),
  email: optionalEmailSchema,
  license_no: z.string().trim().max(128, "So giay phep qua dai").optional(),
  license_date: z.string().trim().optional(),
  tax_code: z.string().trim().max(64, "Ma so thue qua dai").optional(),
  website: optionalUrlSchema,
  note: z.string().trim().max(500, "Ghi chu qua dai").optional(),
})

type CreditInstitutionFormValues = z.infer<typeof creditInstitutionFormSchema>

const creditInstitutionDefaultValues: CreditInstitutionFormValues = {
  code: "",
  name: "",
  address: "",
  status: "active",
  effective_from: "",
  short_name: "",
  phone: "",
  email: "",
  license_no: "",
  license_date: "",
  tax_code: "",
  website: "",
  note: "",
}

function toCreditInstitutionFormValues(item: CreditInstitution): CreditInstitutionFormValues {
  return {
    code: item.code,
    name: item.name,
    address: item.address,
    status: item.status,
    effective_from: item.effective_from || "",
    short_name: item.short_name || "",
    phone: item.phone || "",
    email: item.email || "",
    license_no: item.license_no || "",
    license_date: item.license_date || "",
    tax_code: item.tax_code || "",
    website: item.website || "",
    note: item.note || "",
  }
}

export function CreditInstitutionsPage() {
  const [items, setItems] = useState<CreditInstitution[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]["value"]>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CreditInstitution | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CreditInstitution | null>(null)
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<CreditInstitutionFormValues>({
    resolver: zodResolver(creditInstitutionFormSchema),
    defaultValues: creditInstitutionDefaultValues,
  })

  const load = async () => {
    setLoading(true)
    try {
      const data = await platformApi.listCreditInstitutions({
        status: statusFilter === "all" ? undefined : statusFilter,
        q: query.trim() || undefined,
      })
      setItems(data)
    } catch (err) {
      notify.error("Khong the tai danh sach to chuc tin dung", translateApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter])

  const openCreate = () => {
    setEditingItem(null)
    reset(creditInstitutionDefaultValues)
    setDialogOpen(true)
  }

  const openEdit = (item: CreditInstitution) => {
    setEditingItem(item)
    reset(toCreditInstitutionFormValues(item))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingItem(null)
      reset(creditInstitutionDefaultValues)
    }
  }

  const submitCreditInstitution = handleSubmit(async (values) => {
    try {
      const payload: Partial<CreditInstitution> = {
        code: values.code.trim().toUpperCase(),
        name: values.name.trim(),
        address: values.address.trim(),
        status: values.status,
        effective_from: values.effective_from || undefined,
        short_name: values.short_name?.trim() || undefined,
        phone: values.phone?.trim() || undefined,
        email: values.email.trim() || undefined,
        license_no: values.license_no?.trim() || undefined,
        license_date: values.license_date || undefined,
        tax_code: values.tax_code?.trim() || undefined,
        website: values.website.trim() || undefined,
        note: values.note?.trim() || undefined,
      }

      if (editingItem) {
        await platformApi.updateCreditInstitution(editingItem.id, payload)
        notify.success("Cap nhat to chuc tin dung thanh cong")
      } else {
        await platformApi.createCreditInstitution(payload)
        notify.success("Them to chuc tin dung thanh cong")
      }

      setDialogOpen(false)
      reset(creditInstitutionDefaultValues)
      await load()
    } catch (err) {
      notify.error("Luu to chuc tin dung that bai", translateApiError(err))
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await platformApi.deleteCreditInstitution(deleteTarget.id)
      notify.success("Xoa to chuc tin dung thanh cong")
      setDeleteTarget(null)
      await load()
    } catch (err) {
      notify.error("Xoa to chuc tin dung that bai", translateApiError(err))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">To chuc tin dung</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
            Tong so: {items.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 font-semibold">
          <Plus className="size-4" /> Them to chuc
        </Button>
      </div>

      <Card className="rounded-2xl border-muted/50 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tim theo ma, ten, MST, so giay phep..."
                className="pl-9"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
            >
              <SelectTrigger className="w-full md:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load}>
              Tim kiem
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Dang tai du lieu to chuc tin dung...
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-muted/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Ma to chuc</TableHead>
                    <TableHead>Ten to chuc</TableHead>
                    <TableHead>Ten viet tat</TableHead>
                    <TableHead>So giay phep</TableHead>
                    <TableHead>Ma so thue</TableHead>
                    <TableHead>Trang thai</TableHead>
                    <TableHead>Hieu luc</TableHead>
                    <TableHead className="text-right">Thao tac</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                        Chua co to chuc tin dung nao.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.code}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.address}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.short_name || "-"}</TableCell>
                        <TableCell>{item.license_no || "-"}</TableCell>
                        <TableCell>{item.tax_code || "-"}</TableCell>
                        <TableCell>
                          <Status variant={item.status === "active" ? "success" : "default"}>
                            <StatusIndicator />
                            <StatusLabel>{item.status === "active" ? "Hoat dong" : "Ngung hieu luc"}</StatusLabel>
                          </Status>
                        </TableCell>
                        <TableCell>{item.effective_from || "-"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(item)}>
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
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
            <DialogTitle>{editingItem ? "Cap nhat to chuc tin dung" : "Them to chuc tin dung"}</DialogTitle>
            <DialogDescription>Quan ly danh muc to chuc tin dung dung chung cho he thong.</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitCreditInstitution} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Ma to chuc" htmlFor="credit_code" error={errors.code?.message}>
                <Input
                  id="credit_code"
                  placeholder="BIDV"
                  aria-invalid={Boolean(errors.code)}
                  disabled={!!editingItem}
                  {...register("code")}
                />
              </FormField>
              <FormField label="Ten to chuc" htmlFor="credit_name" error={errors.name?.message}>
                <Input
                  id="credit_name"
                  placeholder="Ngan hang thuong mai co phan ..."
                  aria-invalid={Boolean(errors.name)}
                  {...register("name")}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Dia chi" htmlFor="credit_address" error={errors.address?.message}>
                <Input
                  id="credit_address"
                  placeholder="Dia chi tru so"
                  aria-invalid={Boolean(errors.address)}
                  {...register("address")}
                />
              </FormField>
              <FormField label="Trang thai" htmlFor="credit_status" error={errors.status?.message}>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="credit_status" aria-invalid={Boolean(errors.status)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Hoat dong</SelectItem>
                        <SelectItem value="inactive">Ngung hieu luc</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="Hieu luc (MM/DD/YYYY)" htmlFor="credit_effective_from" error={errors.effective_from?.message}>
                <Controller
                  control={control}
                  name="effective_from"
                  render={({ field }) => (
                    <MaskInput
                      id="credit_effective_from"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
              <FormField label="Ten viet tat" htmlFor="credit_short_name" error={errors.short_name?.message}>
                <Input id="credit_short_name" aria-invalid={Boolean(errors.short_name)} {...register("short_name")} />
              </FormField>
              <FormField label="So dien thoai" htmlFor="credit_phone" error={errors.phone?.message}>
                <Input id="credit_phone" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="Email" htmlFor="credit_email" error={errors.email?.message}>
                <Input id="credit_email" type="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
              </FormField>
              <FormField label="So giay phep" htmlFor="credit_license_no" error={errors.license_no?.message}>
                <Input id="credit_license_no" aria-invalid={Boolean(errors.license_no)} {...register("license_no")} />
              </FormField>
              <FormField label="Ngay cap (MM/DD/YYYY)" htmlFor="credit_license_date" error={errors.license_date?.message}>
                <Controller
                  control={control}
                  name="license_date"
                  render={({ field }) => (
                    <MaskInput
                      id="credit_license_date"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="Ma so thue" htmlFor="credit_tax_code" error={errors.tax_code?.message}>
                <Input id="credit_tax_code" aria-invalid={Boolean(errors.tax_code)} {...register("tax_code")} />
              </FormField>
              <FormField className="md:col-span-2" label="Website" htmlFor="credit_website" error={errors.website?.message}>
                <Input id="credit_website" type="url" aria-invalid={Boolean(errors.website)} {...register("website")} />
              </FormField>
            </div>

            <FormField label="Ghi chu" htmlFor="credit_note" error={errors.note?.message}>
              <Textarea
                id="credit_note"
                placeholder="Thong tin bo sung..."
                aria-invalid={Boolean(errors.note)}
                {...register("note")}
              />
            </FormField>

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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xac nhan xoa to chuc tin dung?</AlertDialogTitle>
            <AlertDialogDescription>
              Ban chac chan muon xoa <strong>{deleteTarget?.name}</strong> khoi danh muc?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xoa bo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
