import { useEffect, useState } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { notify } from "@workspace/notifications/notify"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import type { Position } from "../api"
import {
  useCreatePosition,
  useDeletePosition,
  usePositions,
  useUpdatePosition,
} from "../queries"
import {
  fieldClass,
  positionDefaults,
  positionSchema,
  type PositionValues,
} from "../shared/schemas"
import {
  DataTable,
  DeleteDialog,
  DialogActions,
  PageTitle,
  RowActions,
  StatusBadge,
} from "../shared/ui"

export function PositionsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Position | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Position | null>(null)
  const positions = usePositions()
  const createPosition = useCreatePosition()
  const updatePosition = useUpdatePosition()
  const deletePosition = useDeletePosition()
  const form = useForm<PositionValues>({
    resolver: zodResolver(positionSchema),
    defaultValues: positionDefaults,
  })
  const isManager = useWatch({ control: form.control, name: "is_manager" })

  useEffect(() => {
    if (positions.error) notify.error("Khong the tai danh sach chuc vu")
  }, [positions.error])

  const openCreate = () => {
    setEditing(null)
    form.reset(positionDefaults)
    setDialogOpen(true)
  }

  const openEdit = (item: Position) => {
    setEditing(item)
    form.reset({
      code: item.code,
      name: item.name,
      status: item.status,
      is_manager: item.is_manager,
      description: item.description ?? "",
    })
    setDialogOpen(true)
  }

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
    }
    if (editing) {
      await updatePosition.mutateAsync({ id: editing.id, payload })
    } else {
      await createPosition.mutateAsync(payload)
    }
    setDialogOpen(false)
    form.reset(positionDefaults)
  })

  const items = positions.data ?? []
  return (
    <section className="space-y-4 p-4">
      <PageTitle title="Chuc vu" count={items.length} onCreate={openCreate} />
      <DataTable
        columns={["Ma chuc vu", "Ten chuc vu", "Trang thai", "Cap quan ly", "Mo ta"]}
        empty="Chua co chuc vu."
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.code}</TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
            <TableCell>{item.is_manager ? "Co" : "Khong"}</TableCell>
            <TableCell className="text-muted-foreground">{item.description || "-"}</TableCell>
            <RowActions onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
          </TableRow>
        ))}
      </DataTable>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sua chuc vu" : "Them chuc vu"}</DialogTitle>
            <DialogDescription>Ma va ten chuc vu la bat buoc.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Ma chuc vu (*)" error={form.formState.errors.code?.message}>
              <Input {...form.register("code")} placeholder="GIDO" />
            </FormField>
            <FormField label="Ten chuc vu (*)" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} placeholder="Giam doc" />
            </FormField>
            <FormField label="Trang thai (*)">
              <select className={fieldClass} {...form.register("status")}>
                <option value="active">Hieu luc</option>
                <option value="inactive">Khong hieu luc</option>
              </select>
            </FormField>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isManager}
                onCheckedChange={(value) => form.setValue("is_manager", Boolean(value))}
              />
              Co phai la cap quan ly
            </label>
            <FormField label="Mo ta">
              <Textarea {...form.register("description")} />
            </FormField>
            <DialogActions pending={form.formState.isSubmitting || createPosition.isPending || updatePosition.isPending} />
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        title="Xoa chuc vu"
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deletePosition.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </section>
  )
}

