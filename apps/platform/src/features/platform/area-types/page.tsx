import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { notify } from "@workspace/notifications/notify"
import { translateApiError } from "@workspace/i18n"
import type { LookupValue } from "../api"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
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
import {
  Status,
  StatusIndicator,
  StatusLabel,
} from "@workspace/ui/components/status"
import { Edit2, Plus, Trash2 } from "lucide-react"
import { useAreaTypes, useDeleteAreaType, useUpsertAreaType } from "./queries"

const areaTypeFormSchema = z.object({
  code: z.string().trim().min(1, "Ma loai khu vuc la bat buoc").max(64, "Ma loai khu vuc qua dai"),
  name: z.string().trim().min(1, "Ten loai khu vuc la bat buoc").max(255, "Ten loai khu vuc qua dai"),
  sort_order: z.number().int("Thu tu phai la so nguyen").min(0, "Thu tu khong hop le"),
  is_active: z.boolean(),
})

type AreaTypeFormValues = z.infer<typeof areaTypeFormSchema>

const areaTypeDefaultValues: AreaTypeFormValues = {
  code: "",
  name: "",
  sort_order: 10,
  is_active: true,
}

function toAreaTypeFormValues(item: LookupValue): AreaTypeFormValues {
  return {
    code: item.code,
    name: item.name,
    sort_order: item.sort_order,
    is_active: item.is_active,
  }
}

export function AreaTypesPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<LookupValue | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<LookupValue | null>(null)
  const areaTypesQuery = useAreaTypes()
  const upsertAreaType = useUpsertAreaType()
  const deleteAreaType = useDeleteAreaType()
  const items = areaTypesQuery.data ?? []
  const loading = areaTypesQuery.isLoading
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<AreaTypeFormValues>({
    resolver: zodResolver(areaTypeFormSchema),
    defaultValues: areaTypeDefaultValues,
  })

  useEffect(() => {
    if (areaTypesQuery.error) {
      notify.error("Khong the tai danh sach loai khu vuc", translateApiError(areaTypesQuery.error))
    }
  }, [areaTypesQuery.error])

  const openCreate = () => {
    setEditingItem(null)
    reset({ ...areaTypeDefaultValues, sort_order: items.length * 10 + 10 })
    setDialogOpen(true)
  }

  const openEdit = (item: LookupValue) => {
    setEditingItem(item)
    reset(toAreaTypeFormValues(item))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingItem(null)
      reset(areaTypeDefaultValues)
    }
  }

  const submitAreaType = handleSubmit(async (values) => {
    try {
      const payload: Partial<LookupValue> = {
        code: values.code.trim().toUpperCase().replace(/\s+/g, "_"),
        name: values.name.trim(),
        sort_order: values.sort_order,
        is_active: values.is_active,
      }
      if (editingItem) {
        payload.id = editingItem.id
        payload.category_id = editingItem.category_id
      }
      await upsertAreaType.mutateAsync(payload)
      setDialogOpen(false)
      reset(areaTypeDefaultValues)
    } catch {
      // Mutation hook already shows the save error toast.
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAreaType.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // Mutation hook already shows the delete error toast.
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Loai khu vuc</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
            Tong so: {items.length}
          </Badge>
        </div>
        <Button onClick={openCreate} className="h-9 gap-1.5 px-4 font-semibold">
          <Plus className="size-4" /> Them loai khu vuc
        </Button>
      </div>

      <Card className="overflow-hidden rounded-2xl border-muted/50 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Dang tai du lieu loai khu vuc...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Ma loai</TableHead>
                  <TableHead>Ten loai</TableHead>
                  <TableHead>Thu tu</TableHead>
                  <TableHead>Trang thai</TableHead>
                  <TableHead className="text-right">Thao tac</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Chua co loai khu vuc nao.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.sort_order}</TableCell>
                      <TableCell>
                        <Status variant={item.is_active ? "success" : "default"}>
                          <StatusIndicator />
                          <StatusLabel>{item.is_active ? "Hoat dong" : "Ngung hieu luc"}</StatusLabel>
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
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Cap nhat loai khu vuc" : "Them loai khu vuc"}</DialogTitle>
            <DialogDescription>Quan ly danh muc loai khu vuc dung chung.</DialogDescription>
          </DialogHeader>
          <form autoComplete="off" onSubmit={submitAreaType} className="space-y-4 py-2">
            <FormField label="Ma loai khu vuc" htmlFor="area_type_code" error={errors.code?.message}>
              <Input
                id="area_type_code"
                aria-invalid={Boolean(errors.code)}
                disabled={!!editingItem}
                className="font-mono uppercase"
                {...register("code")}
              />
            </FormField>
            <FormField label="Ten loai khu vuc" htmlFor="area_type_name" error={errors.name?.message}>
              <Input id="area_type_name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Thu tu" htmlFor="area_type_sort" error={errors.sort_order?.message}>
                <Input
                  id="area_type_sort"
                  type="number"
                  aria-invalid={Boolean(errors.sort_order)}
                  {...register("sort_order")}
                />
              </FormField>
              <div className="flex items-center gap-2 pt-7">
                <Controller
                  control={control}
                  name="is_active"
                  render={({ field }) => (
                    <Checkbox
                      id="area_type_active"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <label htmlFor="area_type_active" className="cursor-pointer select-none text-sm font-medium">
                  Dang hoat dong
                </label>
              </div>
            </div>
            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleDialogOpenChange(false)}>
                Huy
              </Button>
              <Button type="submit" disabled={isSubmitting || upsertAreaType.isPending}>
                {isSubmitting || upsertAreaType.isPending ? "Dang luu..." : "Luu lai"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xac nhan xoa loai khu vuc?</AlertDialogTitle>
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
