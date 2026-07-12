import { useCallback, useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { translateApiError } from "@workspace/i18n"
import { notify } from "@workspace/notifications/notify"
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
import { hrmApi, type OrgUnit, type PlatformOrganization } from "../api"
import {
  fieldClass,
  orgUnitDefaults,
  orgUnitSchema,
  type OrgUnitValues,
} from "../shared/schemas"
import {
  DataTable,
  DeleteDialog,
  DialogActions,
  PageTitle,
  RowActions,
  StatusBadge,
} from "../shared/ui"

export function OrgUnitsPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<OrgUnit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgUnit | null>(null)
  const [items, setItems] = useState<OrgUnit[]>([])
  const [orgs, setOrgs] = useState<PlatformOrganization[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [_deleting, setDeleting] = useState(false)
  const form = useForm<OrgUnitValues>({
    resolver: zodResolver(orgUnitSchema),
    defaultValues: orgUnitDefaults,
  })

  const load = useCallback(async () => {
    try {
      const [units, organizations] = await Promise.all([
        hrmApi.listOrgUnits(),
        hrmApi.listOrganizations(),
      ])
      setItems(units)
      setOrgs(organizations.items)
    } catch {
      notify.error("Khong the tai danh sach phong ban")
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const orgName = (id: string) => {
    const org = orgs.find((item) => item.id === id)
    return org ? `${org.code} - ${org.name}` : id
  }
  const parentName = (id?: string) => items.find((item) => item.id === id)?.name ?? "-"

  const openCreate = () => {
    setEditing(null)
    form.reset(orgUnitDefaults)
    setDialogOpen(true)
  }

  const openEdit = (item: OrgUnit) => {
    setEditing(item)
    form.reset({
      code: item.code,
      organization_id: item.organization_id,
      name: item.name,
      org_level: item.org_level,
      parent_id: item.parent_id ?? "",
      department_type: item.department_type,
      status: item.status,
      description: item.description ?? "",
    })
    setDialogOpen(true)
  }

  const submit = form.handleSubmit(async (values) => {
    const payload = {
      ...values,
      code: values.code.trim(),
      name: values.name.trim(),
      parent_id: values.parent_id || undefined,
      description: values.description?.trim() || undefined,
    }
    setSubmitting(true)
    try {
      if (editing) {
        await hrmApi.updateOrgUnit(editing.id, payload)
        notify.success("Da cap nhat phong ban")
      } else {
        await hrmApi.createOrgUnit(payload)
        notify.success("Da luu phong ban")
      }
      setDialogOpen(false)
      form.reset(orgUnitDefaults)
      await load()
    } catch (reason) {
      notify.error("Luu phong ban that bai", translateApiError(reason))
    } finally {
      setSubmitting(false)
    }
  })

  return (
    <section className="space-y-4 p-4">
      <PageTitle title="Co cau to chuc" count={items.length} onCreate={openCreate} />
      <DataTable
        columns={["Ma phong ban", "Ten phong ban", "Don vi", "Cap", "Cap cha", "Loai", "Trang thai"]}
        empty="Chua co phong ban."
      >
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.code}</TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>{orgName(item.organization_id)}</TableCell>
            <TableCell>{item.org_level}</TableCell>
            <TableCell>{parentName(item.parent_id)}</TableCell>
            <TableCell>{item.department_type}</TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
            <RowActions onEdit={() => openEdit(item)} onDelete={() => setDeleteTarget(item)} />
          </TableRow>
        ))}
      </DataTable>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Sua phong ban" : "Them phong ban"}</DialogTitle>
            <DialogDescription>Ma don vi lay tu platform.organizations.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Ma phong ban (*)" error={form.formState.errors.code?.message}>
              <Input {...form.register("code")} />
            </FormField>
            <FormField label="Ma don vi (*)" error={form.formState.errors.organization_id?.message}>
              <select className={fieldClass} {...form.register("organization_id")}>
                <option value="">Chon don vi</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.code} - {org.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Ten phong ban (*)" error={form.formState.errors.name?.message}>
              <Input {...form.register("name")} />
            </FormField>
            <FormField label="Cap to chuc (*)" error={form.formState.errors.org_level?.message}>
              <Input {...form.register("org_level")} placeholder="HOI_SO, PHONG, TO" />
            </FormField>
            <FormField label="Ma cap cha">
              <select className={fieldClass} {...form.register("parent_id")}>
                <option value="">Khong co</option>
                {items
                  .filter((item) => item.id !== editing?.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} - {item.name}
                    </option>
                  ))}
              </select>
            </FormField>
            <FormField label="Loai phong ban (*)" error={form.formState.errors.department_type?.message}>
              <Input {...form.register("department_type")} placeholder="PHONG_BAN" />
            </FormField>
            <FormField label="Trang thai (*)">
              <select className={fieldClass} {...form.register("status")}>
                <option value="active">Hieu luc</option>
                <option value="inactive">Khong hieu luc</option>
              </select>
            </FormField>
            <FormField label="Mo ta">
              <Textarea {...form.register("description")} />
            </FormField>
            <DialogActions pending={form.formState.isSubmitting || submitting} />
          </form>
        </DialogContent>
      </Dialog>
      <DeleteDialog
        title="Xoa phong ban"
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          setDeleting(true)
          try {
            await hrmApi.deleteOrgUnit(deleteTarget.id)
            notify.success("Da xoa phong ban")
            setDeleteTarget(null)
            await load()
          } catch (reason) {
            notify.error("Xoa phong ban that bai", translateApiError(reason))
          } finally {
            setDeleting(false)
          }
        }}
      />
    </section>
  )
}