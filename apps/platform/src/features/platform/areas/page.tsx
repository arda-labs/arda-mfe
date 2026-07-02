import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { notify } from "@workspace/notifications/notify"
import { translateApiError } from "@workspace/i18n"
import type { Area, GeoAdminUnit, LookupValue } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { MaskInput } from "@workspace/ui/components/mask-input"
import { Textarea } from "@workspace/ui/components/textarea"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Edit2, Plus, Search, Trash2 } from "lucide-react"
import {
  useAreaDependencies,
  useAreas,
  useCreateArea,
  useDeleteArea,
  useUpdateArea,
} from "./queries"

const STATUS_OPTIONS = [
  { value: "all", label: "Tat ca" },
  { value: "active", label: "Hoat dong" },
  { value: "inactive", label: "Ngung hieu luc" },
] as const

const areaFormSchema = z.object({
  code: z.string().trim().min(1, "Ma khu vuc la bat buoc").max(64, "Ma khu vuc qua dai"),
  name: z.string().trim().min(1, "Ten khu vuc la bat buoc").max(255, "Ten khu vuc qua dai"),
  area_type_code: z.string().trim().min(1, "Loai khu vuc la bat buoc"),
  parent_id: z.string().trim().optional(),
  admin_unit_code: z.string().trim().optional(),
  description: z.string().trim().max(500, "Mo ta qua dai").optional(),
  status: z.enum(["active", "inactive"]),
  effective_from: z.string().trim().optional(),
  effective_to: z.string().trim().optional(),
})

type AreaFormValues = z.infer<typeof areaFormSchema>

const areaDefaultValues: AreaFormValues = {
  code: "",
  name: "",
  area_type_code: "",
  parent_id: "",
  admin_unit_code: "",
  description: "",
  status: "active",
  effective_from: "",
  effective_to: "",
}

function toAreaFormValues(item: Area): AreaFormValues {
  return {
    code: item.code,
    name: item.name,
    area_type_code: item.area_type_code,
    parent_id: item.parent_id || "",
    admin_unit_code: item.admin_unit_code || "",
    description: item.description || "",
    status: item.status,
    effective_from: item.effective_from || "",
    effective_to: item.effective_to || "",
  }
}

export function AreasPage() {
  const [query, setQuery] = useState("")
  const [submittedQuery, setSubmittedQuery] = useState("")
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]["value"]>("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Area | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Area | null>(null)
  const areaParams = {
    status: statusFilter === "all" ? undefined : statusFilter,
    areaTypeCode: typeFilter === "all" ? undefined : typeFilter,
    q: submittedQuery || undefined,
  }
  const dependenciesQuery = useAreaDependencies()
  const areasQuery = useAreas(areaParams)
  const createArea = useCreateArea()
  const updateArea = useUpdateArea()
  const deleteArea = useDeleteArea()
  const items = areasQuery.data ?? []
  const areaTypes = (dependenciesQuery.data?.areaTypes ?? []) as LookupValue[]
  const adminUnits = (dependenciesQuery.data?.adminUnits ?? []) as GeoAdminUnit[]
  const loading = areasQuery.isLoading || dependenciesQuery.isLoading
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<AreaFormValues>({
    resolver: zodResolver(areaFormSchema),
    defaultValues: areaDefaultValues,
  })

  useEffect(() => {
    const error = dependenciesQuery.error || areasQuery.error
    if (error) {
      notify.error("Khong the tai danh sach khu vuc", translateApiError(error))
    }
  }, [dependenciesQuery.error, areasQuery.error])

  const openCreate = () => {
    setEditingItem(null)
    reset(areaDefaultValues)
    setDialogOpen(true)
  }

  const openEdit = (item: Area) => {
    setEditingItem(item)
    reset(toAreaFormValues(item))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingItem(null)
      reset(areaDefaultValues)
    }
  }

  const submitArea = handleSubmit(async (values) => {
    try {
      const payload: Partial<Area> = {
        code: values.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: values.name.trim(),
        area_type_code: values.area_type_code,
        parent_id: values.parent_id || undefined,
        admin_unit_code: values.admin_unit_code || undefined,
        description: values.description?.trim() || undefined,
        status: values.status,
        effective_from: values.effective_from || undefined,
        effective_to: values.effective_to || undefined,
      }

      if (editingItem) {
        await updateArea.mutateAsync({ id: editingItem.id, payload })
      } else {
        await createArea.mutateAsync(payload)
      }

      setDialogOpen(false)
      reset(areaDefaultValues)
    } catch {
      // Mutation hooks already show the save error toast.
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteArea.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // Mutation hook already shows the delete error toast.
    }
  }

  const getAreaTypeLabel = (code: string) =>
    areaTypes.find((item) => item.code === code)?.name || code

  const getParentLabel = (parentId?: string) =>
    items.find((item) => item.id === parentId)?.name || "-"

  const getAdminUnitLabel = (code?: string) =>
    adminUnits.find((item) => item.code === code)?.name || code || "-"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Khu vuc</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
            Tong so: {items.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 font-semibold">
          <Plus className="size-4" /> Them khu vuc
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
                placeholder="Tim theo ma, ten hoac mo ta..."
                className="pl-9"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Loai khu vuc" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tat ca loai khu vuc</SelectItem>
                {areaTypes.map((item) => (
                  <SelectItem key={item.id} value={item.code}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button variant="outline" onClick={() => setSubmittedQuery(query.trim())}>
              Tim kiem
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Dang tai du lieu khu vuc...
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-muted/50">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Ma khu vuc</TableHead>
                    <TableHead>Ten khu vuc</TableHead>
                    <TableHead>Loai khu vuc</TableHead>
                    <TableHead>Khu vuc cha</TableHead>
                    <TableHead>Don vi hanh chinh</TableHead>
                    <TableHead>Trang thai</TableHead>
                    <TableHead className="text-right">Thao tac</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                        Chua co khu vuc nao.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.code}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-muted-foreground">{item.description || "-"}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getAreaTypeLabel(item.area_type_code)}</TableCell>
                        <TableCell>{getParentLabel(item.parent_id)}</TableCell>
                        <TableCell>{getAdminUnitLabel(item.admin_unit_code)}</TableCell>
                        <TableCell>
                          <Status variant={item.status === "active" ? "success" : "default"}>
                            <StatusIndicator />
                            <StatusLabel>{item.status === "active" ? "Hoat dong" : "Ngung hieu luc"}</StatusLabel>
                          </Status>
                        </TableCell>
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
            <DialogTitle>{editingItem ? "Cap nhat khu vuc" : "Them khu vuc"}</DialogTitle>
            <DialogDescription>Quan ly khu vuc nghiep vu voi phan cap cha con.</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitArea} className="space-y-4 py-2">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Ma khu vuc" htmlFor="area_code" error={errors.code?.message}>
                <Input id="area_code" aria-invalid={Boolean(errors.code)} disabled={!!editingItem} {...register("code")} />
              </FormField>
              <FormField label="Ten khu vuc" htmlFor="area_name" error={errors.name?.message}>
                <Input id="area_name" aria-invalid={Boolean(errors.name)} {...register("name")} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="Loai khu vuc" htmlFor="area_type_code" error={errors.area_type_code?.message}>
                <Controller
                  control={control}
                  name="area_type_code"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="area_type_code" aria-invalid={Boolean(errors.area_type_code)}>
                        <SelectValue placeholder="Chon loai khu vuc" />
                      </SelectTrigger>
                      <SelectContent>
                        {areaTypes.map((item) => (
                          <SelectItem key={item.id} value={item.code}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Khu vuc cha" htmlFor="area_parent_id" error={errors.parent_id?.message}>
                <Controller
                  control={control}
                  name="parent_id"
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                      <SelectTrigger id="area_parent_id" aria-invalid={Boolean(errors.parent_id)}>
                        <SelectValue placeholder="Khong co" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Khong co</SelectItem>
                        {items
                          .filter((item) => !editingItem || item.id !== editingItem.id)
                          .map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="Don vi hanh chinh" htmlFor="area_admin_unit_code" error={errors.admin_unit_code?.message}>
                <Controller
                  control={control}
                  name="admin_unit_code"
                  render={({ field }) => (
                    <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                      <SelectTrigger id="area_admin_unit_code" aria-invalid={Boolean(errors.admin_unit_code)}>
                        <SelectValue placeholder="Khong lien ket" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Khong lien ket</SelectItem>
                        {adminUnits.map((item) => (
                          <SelectItem key={item.code} value={item.code}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="Trang thai" htmlFor="area_status" error={errors.status?.message}>
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="area_status" aria-invalid={Boolean(errors.status)}>
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
              <FormField label="Hieu luc tu (MM/DD/YYYY)" htmlFor="area_effective_from" error={errors.effective_from?.message}>
                <Controller
                  control={control}
                  name="effective_from"
                  render={({ field }) => (
                    <MaskInput
                      id="area_effective_from"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
              <FormField label="Hieu luc den (MM/DD/YYYY)" htmlFor="area_effective_to" error={errors.effective_to?.message}>
                <Controller
                  control={control}
                  name="effective_to"
                  render={({ field }) => (
                    <MaskInput
                      id="area_effective_to"
                      mask="date"
                      className="h-10 w-full bg-background py-2 [box-shadow:none] ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-background"
                      value={field.value || ""}
                      onValueChange={field.onChange}
                    />
                  )}
                />
              </FormField>
            </div>

            <FormField label="Ghi chu / mo ta" htmlFor="area_description" error={errors.description?.message}>
              <Textarea
                id="area_description"
                aria-invalid={Boolean(errors.description)}
                placeholder="Thong tin mo ta khu vuc..."
                {...register("description")}
              />
            </FormField>

            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleDialogOpenChange(false)}>
                Huy
              </Button>
              <Button type="submit" disabled={isSubmitting || createArea.isPending || updateArea.isPending}>
                {isSubmitting || createArea.isPending || updateArea.isPending ? "Dang luu..." : "Luu lai"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xac nhan ngung hieu luc khu vuc?</AlertDialogTitle>
            <AlertDialogDescription>
              Hanh dong nay se chuyen khu vuc <strong>{deleteTarget?.name}</strong> sang trang thai ngung hieu luc.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Xac nhan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
