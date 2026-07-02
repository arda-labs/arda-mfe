import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { translateApiError } from "@workspace/i18n"
import type { Organization } from "../api"
import { notify } from "@workspace/notifications/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import { Status, StatusIndicator, StatusLabel } from "@workspace/ui/components/status"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Building2, Edit2, FolderTree, List, Plus, Trash2 } from "lucide-react"
import {
  useCreateOrganization,
  useDeleteOrganization,
  useOrganizations,
  useUpdateOrganization,
} from "./queries"

const organizationFormSchema = z.object({
  code: z.string().trim().min(1, "Ma don vi la bat buoc").max(64, "Ma don vi qua dai"),
  name: z.string().trim().min(1, "Ten don vi la bat buoc").max(255, "Ten don vi qua dai"),
  parent_id: z.string().trim().optional(),
  address: z.string().trim().max(500, "Dia chi qua dai").optional(),
  is_active: z.boolean(),
})

type OrganizationFormValues = z.infer<typeof organizationFormSchema>

const organizationDefaultValues: OrganizationFormValues = {
  code: "",
  name: "",
  parent_id: "",
  address: "",
  is_active: true,
}

function toOrganizationFormValues(item: Organization): OrganizationFormValues {
  return {
    code: item.code,
    name: item.name,
    parent_id: item.parent_id || "",
    address: item.address || "",
    is_active: item.is_active,
  }
}

export function OrganizationsPage() {
  const [viewMode, setViewMode] = useState<"list" | "tree">("list")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null)
  const organizationsQuery = useOrganizations()
  const createOrganization = useCreateOrganization()
  const updateOrganization = useUpdateOrganization()
  const deleteOrganization = useDeleteOrganization()
  const orgs = organizationsQuery.data ?? []
  const loading = organizationsQuery.isLoading
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: organizationDefaultValues,
  })

  useEffect(() => {
    if (organizationsQuery.error) {
      notify.error("Khong the tai danh sach don vi", translateApiError(organizationsQuery.error))
    }
  }, [organizationsQuery.error])

  const openCreate = () => {
    setEditingOrg(null)
    reset(organizationDefaultValues)
    setDialogOpen(true)
  }

  const openEdit = (org: Organization) => {
    setEditingOrg(org)
    reset(toOrganizationFormValues(org))
    setDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setEditingOrg(null)
      reset(organizationDefaultValues)
    }
  }

  const submitOrganization = handleSubmit(async (values) => {
    try {
      const payload: Partial<Organization> = {
        code: values.code.trim(),
        name: values.name.trim(),
        parent_id: values.parent_id || undefined,
        address: values.address?.trim() || undefined,
        is_active: values.is_active,
      }

      if (editingOrg) {
        await updateOrganization.mutateAsync({ id: editingOrg.id, payload })
      } else {
        await createOrganization.mutateAsync(payload)
      }
      setDialogOpen(false)
      reset(organizationDefaultValues)
    } catch {
      // Mutation hooks already show the action error toast.
    }
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteOrganization.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // Mutation hook already shows the delete error toast.
    }
  }

  const renderTree = (parentId: string | undefined = undefined, depth = 0) => {
    const children = orgs.filter((org) => org.parent_id === parentId)
    if (children.length === 0) return null

    return (
      <div className={`space-y-2 ${depth > 0 ? "pl-6 border-l border-muted/80 ml-3 mt-2" : ""}`}>
        {children.map((org) => (
          <div key={org.id} className="group">
            <div className="flex items-center justify-between rounded-xl border border-muted/60 bg-muted/10 p-3 transition-all hover:bg-muted/20">
              <div className="flex items-center gap-3">
                <Building2 className="size-4 text-primary/70" />
                <div>
                  <span className="text-sm font-semibold">{org.name}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">({org.code})</span>
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(org)}>
                  <Edit2 className="size-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget(org)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
            {renderTree(org.id, depth + 1)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-foreground">Don vi & To chuc</h2>
          <Badge variant="secondary" className="px-2.5 py-0.5 text-xs font-bold">
            Tong so: {orgs.length}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-input bg-background p-0.5">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-md px-2.5"
              onClick={() => setViewMode("list")}
            >
              <List className="mr-1 size-3.5" /> Danh sach
            </Button>
            <Button
              variant={viewMode === "tree" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 rounded-md px-2.5"
              onClick={() => setViewMode("tree")}
            >
              <FolderTree className="mr-1 size-3.5" /> So do cay
            </Button>
          </div>
          <Button onClick={openCreate} className="h-9 gap-1.5 px-4 text-sm font-semibold">
            <Plus className="size-4" /> Them don vi
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Dang tai du lieu don vi...
        </div>
      ) : viewMode === "tree" ? (
        <Card className="rounded-2xl border-muted/50 shadow-sm">
          <CardContent className="p-6">{renderTree(undefined)}</CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-muted/50 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[150px]">Ma don vi</TableHead>
                  <TableHead>Ten don vi</TableHead>
                  <TableHead>Don vi cap tren</TableHead>
                  <TableHead>Trang thai</TableHead>
                  <TableHead className="text-right">Thao tac</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orgs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Chua co don vi nao duoc tao.
                    </TableCell>
                  </TableRow>
                ) : (
                  orgs.map((org) => {
                    const parent = orgs.find((item) => item.id === org.parent_id)
                    return (
                      <TableRow key={org.id}>
                        <TableCell className="font-mono text-xs">{org.code}</TableCell>
                        <TableCell className="font-medium">{org.name}</TableCell>
                        <TableCell className="text-muted-foreground">{parent ? parent.name : "-"}</TableCell>
                        <TableCell>
                          <Status variant={org.is_active ? "success" : "default"}>
                            <StatusIndicator />
                            <StatusLabel>{org.is_active ? "Hoat dong" : "Tam ngung"}</StatusLabel>
                          </Status>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(org)}>
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => setDeleteTarget(org)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingOrg ? "Cap nhat don vi" : "Them don vi moi"}</DialogTitle>
            <DialogDescription>Nhap thong tin cau truc to chuc hoac don vi.</DialogDescription>
          </DialogHeader>

          <form autoComplete="off" onSubmit={submitOrganization} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ma don vi" htmlFor="org_code" error={errors.code?.message}>
                <Input
                  id="org_code"
                  placeholder="ORG_01"
                  aria-invalid={Boolean(errors.code)}
                  disabled={!!editingOrg}
                  spellCheck={false}
                  {...register("code")}
                />
              </FormField>
              <FormField label="Ten don vi" htmlFor="org_name" error={errors.name?.message}>
                <Input
                  id="org_name"
                  placeholder="Van phong dai dien"
                  aria-invalid={Boolean(errors.name)}
                  spellCheck={false}
                  {...register("name")}
                />
              </FormField>
            </div>

            <FormField label="Don vi cap tren" htmlFor="org_parent_id" error={errors.parent_id?.message}>
              <Controller
                control={control}
                name="parent_id"
                render={({ field }) => (
                  <Select value={field.value || "none"} onValueChange={(value) => field.onChange(value === "none" ? "" : value)}>
                    <SelectTrigger id="org_parent_id" aria-invalid={Boolean(errors.parent_id)}>
                      <SelectValue placeholder="Khong co" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Khong co</SelectItem>
                      {orgs
                        .filter((org) => !editingOrg || org.id !== editingOrg.id)
                        .map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <FormField label="Dia chi" htmlFor="org_address" error={errors.address?.message}>
              <Input
                id="org_address"
                placeholder="Dia chi tru so"
                aria-invalid={Boolean(errors.address)}
                spellCheck={false}
                {...register("address")}
              />
            </FormField>

            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="org_is_active"
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                  <label htmlFor="org_is_active" className="cursor-pointer select-none text-sm font-medium">
                    Don vi dang hoat dong
                  </label>
                </div>
              )}
            />

            <div className="flex gap-2 sm:justify-end">
              <Button variant="outline" type="button" onClick={() => handleDialogOpenChange(false)}>
                Huy
              </Button>
              <Button type="submit" disabled={isSubmitting || createOrganization.isPending || updateOrganization.isPending}>
                {isSubmitting || createOrganization.isPending || updateOrganization.isPending ? "Dang luu..." : "Luu lai"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xac nhan xoa don vi?</AlertDialogTitle>
            <AlertDialogDescription>
              Hanh dong nay se ngung kich hoat don vi <strong>{deleteTarget?.name}</strong>. Cau truc cay cap duoi lien quan cung co the bi anh huong.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Huy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Xoa bo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
