import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { getMenuIcon, menuIconNames } from "@workspace/ui/config/menu-icons"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
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
import { Info } from "lucide-react"
import type { PlatformMenuItem } from "../api"
import { upsertMenuItem } from "../api"
import {
  buildMenuSchema,
  menuDefaultValues,
  remoteValues,
  toMenuFormValues,
  type MenuFormValues,
} from "../schema"

export function MenuFormDialog({
  open,
  onOpenChange,
  rows,
  editingItem,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: PlatformMenuItem[]
  editingItem: PlatformMenuItem | null
  onSuccess: () => Promise<void>
}) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)

  const menuSchema = useMemo(() => buildMenuSchema(t), [t])
  const codeById = useMemo(
    () => new Map(rows.map((row) => [row.id, row.code])),
    [rows]
  )
  // Codes can collide (global row + tenant override); prefer the tenant row
  // since the effective menu resolves overrides by code in its favor.
  const resolveParentId = (parentCode: string): string | undefined => {
    if (!parentCode) return undefined
    const matches = rows.filter((row) => row.code === parentCode)
    return (matches.find((row) => row.tenant_id) ?? matches[0])?.id
  }

  const parentOptions = useMemo(() => {
    if (!editingItem) {
      return [...new Map(rows.map((row) => [row.code, row])).values()]
    }
    const excluded = new Set([editingItem.id])
    const queue = [editingItem.id]
    while (queue.length > 0) {
      const current = queue.pop()!
      for (const row of rows) {
        if (row.parent_id === current && !excluded.has(row.id)) {
          excluded.add(row.id)
          queue.push(row.id)
        }
      }
    }
    return [
      ...new Map(
        rows
          .filter((row) => !excluded.has(row.id))
          .map((row) => [row.code, row])
      ).values(),
    ]
  }, [rows, editingItem])

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    values: editingItem
      ? toMenuFormValues(editingItem, codeById)
      : menuDefaultValues,
  })

  const isEditing = Boolean(editingItem)
  const isGlobalOverride = Boolean(editingItem && !editingItem.tenant_id)

  const handleDialogClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) reset(menuDefaultValues)
  }

  const submitMenu = handleSubmit(async (values) => {
    setSaving(true)
    try {
      await upsertMenuItem({
        // Editing always keeps the original code: it is the upsert key. For a
        // global seed the save (without id) creates a tenant-scoped override.
        id: editingItem && !isGlobalOverride ? editingItem.id : undefined,
        code: values.code.trim(),
        title: values.title.trim(),
        path: values.path.trim(),
        parent_id: resolveParentId(values.parent_code),
        icon: values.icon,
        remote: values.remote,
        required_permission: values.required_permission.trim(),
        sort_order: values.sort_order,
        is_active: values.is_active,
      })
      notify.success(t("platform.menus.toast.save_success"))
      handleDialogClose(false)
      await onSuccess()
    } catch (err) {
      notify.error(
        t("platform.menus.toast.save_failed"),
        translateApiError(err)
      )
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t("platform.menus.edit")
              : t("platform.menus.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.menus.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        {isGlobalOverride && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            <span>{t("platform.menus.override_notice")}</span>
          </div>
        )}

        <form
          autoComplete="off"
          onSubmit={submitMenu}
          className="space-y-4 py-2"
        >
          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.menus.field.code")}
              htmlFor="menu_code"
              error={errors.code?.message}
            >
              <Input
                id="menu_code"
                placeholder="vd: finance.reports"
                aria-invalid={Boolean(errors.code)}
                disabled={isEditing}
                className="font-mono"
                autoComplete="off"
                {...register("code")}
              />
            </FormField>
            <FormField
              label={t("platform.menus.field.title")}
              htmlFor="menu_title"
              error={errors.title?.message}
            >
              <Input
                id="menu_title"
                aria-invalid={Boolean(errors.title)}
                autoComplete="off"
                {...register("title")}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.menus.field.parent")}
              htmlFor="menu_parent"
            >
              <Controller
                control={control}
                name="parent_code"
                render={({ field }) => (
                  <Select
                    value={field.value || "__root__"}
                    onValueChange={(selected) =>
                      field.onChange(
                        selected === "__root__" ? "" : selected
                      )
                    }
                  >
                    <SelectTrigger id="menu_parent">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__root__">
                        {t("platform.menus.field.parent_none")}
                      </SelectItem>
                      {parentOptions.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.title} ({option.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label={t("platform.menus.field.icon")}
              htmlFor="menu_icon"
            >
              <Controller
                control={control}
                name="icon"
                render={({ field }) => (
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(selected) =>
                      field.onChange(selected === "__none__" ? "" : selected)
                    }
                  >
                    <SelectTrigger id="menu_icon">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {t("platform.menus.field.icon_none")}
                      </SelectItem>
                      {menuIconNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          <span className="flex items-center gap-2">
                            {(() => {
                              const Icon = getMenuIcon(name)
                              return <Icon className="size-3.5" />
                            })()}
                            <span className="font-mono text-xs">{name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.menus.field.path")}
              htmlFor="menu_path"
              error={errors.path?.message}
            >
              <Input
                id="menu_path"
                placeholder={t("platform.menus.placeholder.path")}
                aria-invalid={Boolean(errors.path)}
                className="font-mono"
                autoComplete="off"
                {...register("path")}
              />
            </FormField>
            <FormField
              label={t("platform.menus.field.remote")}
              htmlFor="menu_remote"
            >
              <Controller
                control={control}
                name="remote"
                render={({ field }) => (
                  <Select
                    value={field.value || "__none__"}
                    onValueChange={(selected) =>
                      field.onChange(selected === "__none__" ? "" : selected)
                    }
                  >
                    <SelectTrigger id="menu_remote">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        {t("platform.menus.field.remote_none")}
                      </SelectItem>
                      {remoteValues.filter(Boolean).map((remote) => (
                        <SelectItem key={remote} value={remote}>
                          {remote}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <FormField
            label={t("platform.menus.field.required_permission")}
            htmlFor="menu_permission"
            error={errors.required_permission?.message}
          >
            <Input
              id="menu_permission"
              placeholder={t("platform.menus.placeholder.permission")}
              aria-invalid={Boolean(errors.required_permission)}
              className="font-mono"
              autoComplete="off"
              {...register("required_permission")}
            />
          </FormField>

          <div className="grid grid-cols-2 items-start gap-4">
            <FormField
              label={t("platform.menus.field.sort_order")}
              htmlFor="menu_sort_order"
              error={errors.sort_order?.message}
            >
              <Input
                id="menu_sort_order"
                type="number"
                min={0}
                aria-invalid={Boolean(errors.sort_order)}
                {...register("sort_order", { valueAsNumber: true })}
              />
            </FormField>
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <div className="flex items-center gap-2 pt-7">
                  <Checkbox
                    id="menu_is_active"
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                  />
                  <label
                    htmlFor="menu_is_active"
                    className="cursor-pointer text-sm font-medium select-none"
                  >
                    {t("platform.menus.field.is_active")}
                  </label>
                </div>
              )}
            />
          </div>

          <div className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleDialogClose(false)}
            >
              {t("common.action.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || saving}>
              {isSubmitting || saving
                ? t("common.action.saving")
                : t("common.action.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
