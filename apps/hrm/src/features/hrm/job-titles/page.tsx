import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
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
import type { JobTitle } from "../api"
import {
  useCreateJobTitle,
  useDeleteJobTitle,
  useJobTitles,
  useUpdateJobTitle,
} from "../queries"
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
  const jobTitles = useJobTitles()
  const createJobTitle = useCreateJobTitle()
  const updateJobTitle = useUpdateJobTitle()
  const deleteJobTitle = useDeleteJobTitle()
  const form = useForm<JobTitleValues>({
    resolver: zodResolver(jobTitleSchema),
    defaultValues: jobTitleDefaults,
  })
  const items = jobTitles.data ?? []

  const openCreate = () => {
    setEditing(null)
    form.reset(jobTitleDefaults)
    setDialogOpen(true)
  }

  const openEdit = (item: JobTitle) => {
    setEditing(item)
    form.reset({ code: item.code, name: item.name, description: item.description ?? "" })
    setDialogOpen(true)
  }

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      code: values.code.trim(),
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
    }
    if (editing) {
      await updateJobTitle.mutateAsync({ id: editing.id, payload })
    } else {
      await createJobTitle.mutateAsync(payload)
    }
    setDialogOpen(false)
    form.reset(jobTitleDefaults)
  })

  return (
    <section className="space-y-4 p-4">
      <PageTitle title="Chuc danh" count={items.length} onCreate={openCreate} />
      <DataTable columns={["Ma chuc danh", "Ten chuc danh", "Mo ta"]} empty="Chua co chuc danh.">
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.code}</TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell className="text-muted-foreground">{item.description || "-"}</TableCell>
            <RowActions onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
          </TableRow>
        ))}
      </DataTable>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sua chuc danh" : "Them chuc danh"}</DialogTitle>
            <DialogDescription>Ma va ten chuc danh la bat buoc.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Ma chuc danh (*)" error={form.formState.errors.code?.message}>
              <Input {...form.register("code")} placeholder="KETO" />
            </FormField>
            <FormField label="Ten chuc danh (*)" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} placeholder="Ke toan" />
            </FormField>
            <FormField label="Mo ta">
              <Textarea {...form.register("description")} />
            </FormField>
            <DialogActions pending={form.formState.isSubmitting || createJobTitle.isPending || updateJobTitle.isPending} />
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        title="Xoa chuc danh"
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          await deleteJobTitle.mutateAsync(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </section>
  )
}

