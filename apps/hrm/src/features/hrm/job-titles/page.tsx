import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
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
import { hrmApi, type JobTitle } from "../api"
import {
  jobTitleDefaults,
  jobTitleSchema,
  type JobTitleValues,
} from "../shared/schemas"
import {
  DataTable,
  DeleteDialog,
  DialogActions,
  PageTitle,
  RowActions,
} from "../shared/ui"

export function JobTitlesPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<JobTitle | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JobTitle | null>(null)
  const [items, setItems] = useState<JobTitle[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [_deleting, setDeleting] = useState(false)
  const form = useForm<JobTitleValues>({
    resolver: zodResolver(jobTitleSchema),
    defaultValues: jobTitleDefaults,
  })

  const load = useCallback(async () => {
    try {
      const result = await hrmApi.listJobTitles()
      setItems(result)
    } catch {
      notify.error("Khong the tai danh sach chuc danh")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    form.reset(jobTitleDefaults)
    setDialogOpen(true)
  }

  const openEdit = (item: JobTitle) => {
    setEditing(item)
    form.reset({
      code: item.code,
      name: item.name,
      description: item.description ?? "",
    })
    setDialogOpen(true)
  }

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
    }
    setSubmitting(true)
    try {
      if (editing) {
        await hrmApi.updateJobTitle(editing.id, payload)
        notify.success("Da cap nhat chuc danh")
      } else {
        await hrmApi.createJobTitle(payload)
        notify.success("Da luu chuc danh")
      }
      setDialogOpen(false)
      form.reset(jobTitleDefaults)
      await load()
    } catch (reason) {
      notify.error("Luu chuc danh that bai", translateApiError(reason))
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <section className="space-y-4 p-4">
      <PageTitle title="Chuc danh" count={items.length} onCreate={openCreate} />
      <DataTable
        columns={["Ma chuc danh", "Ten chuc danh", "Mo ta"]}
        empty="Chua co chuc danh."
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.code}</TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell className="text-muted-foreground">
              {item.description || "-"}
            </TableCell>
            <RowActions
              onEdit={() => openEdit(item)}
              onDelete={() => setDeleteTarget(item)}
            />
          </TableRow>
        ))}
      </DataTable>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Sua chuc danh" : "Them chuc danh"}
            </DialogTitle>
            <DialogDescription>
              Ma va ten chuc danh la bat buoc.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <FormField
              label="Ma chuc danh (*)"
              error={form.formState.errors.code?.message}
            >
              <Input {...form.register("code")} placeholder="KETO" />
            </FormField>
            <FormField
              label="Ten chuc danh (*)"
              error={form.formState.errors.name?.message}
            >
              <Input {...form.register("name")} placeholder="Ke toan" />
            </FormField>
            <FormField label="Mo ta">
              <Textarea {...form.register("description")} />
            </FormField>
            <DialogActions
              pending={form.formState.isSubmitting || submitting}
            />
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        title="Xoa chuc danh"
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          try {
            await hrmApi.deleteJobTitle(deleteTarget.id)
            notify.success("Da xoa chuc danh")
            setDeleteTarget(null)
            await load()
          } catch (reason) {
            notify.error("Xoa chuc danh that bai", translateApiError(reason))
          } finally {
            setDeleting(false)
          }
        }}
      />
    </section>
  )
}
