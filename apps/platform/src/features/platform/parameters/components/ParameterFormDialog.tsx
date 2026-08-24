import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { translateApiError, useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import type { Organization, Parameter } from "../../api"
import { platformApi } from "../../api"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { FormField } from "@workspace/ui/components/form-field"
import { Input } from "@workspace/ui/components/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"
import {
  buildParameterSchema,
  parameterDefaultValues,
  scopeTypeValues,
  toParameterFormValues,
  valueTypeValues,
  type ParameterFormValues,
} from "../schema"

export function ParameterFormDialog({
  open,
  onOpenChange,
  editingParam,
  orgs,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingParam: Parameter | null
  orgs: Organization[]
  onSuccess: () => Promise<void>
}) {
  const { t } = useI18n()
  const [orgSearchOpen, setOrgSearchOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const parameterSchema = useMemo(() => buildParameterSchema(t), [t])
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<ParameterFormValues>({
    resolver: zodResolver(parameterSchema),
    values: editingParam
      ? toParameterFormValues(editingParam)
      : parameterDefaultValues,
  })

  const valueType = watch("value_type")
  const scopeType = watch("scope_type")
  const value = watch("value")

  const handleDialogClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setOrgSearchOpen(false)
      reset(parameterDefaultValues)
    }
  }

  const submitParameter = handleSubmit(async (values) => {
    setSaving(true)
    try {
      const payload: Partial<Parameter> = {
        key: values.key.trim().toUpperCase().replace(/\s+/g, "_"),
        value: values.value,
        value_type: values.value_type,
        scope_type: values.scope_type,
        scope_id: values.scope_id?.trim() || undefined,
        description: values.description?.trim() || undefined,
        is_secret: values.is_secret,
      }
      if (editingParam) {
        payload.id = editingParam.id
      }
      await platformApi.upsertParameter(payload)
      notify.success(t("platform.parameters.toast.save_success"))
      handleDialogClose(false)
      await onSuccess()
    } catch (err) {
      notify.error(t("platform.parameters.toast.save_failed"), translateApiError(err))
    } finally {
      setSaving(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingParam
              ? t("platform.parameters.edit")
              : t("platform.parameters.create_title")}
          </DialogTitle>
          <DialogDescription>
            {t("platform.parameters.dialog_description")}
          </DialogDescription>
        </DialogHeader>

        <form
          autoComplete="off"
          onSubmit={submitParameter}
          className="space-y-4 py-2"
        >
          <FormField
            label={t("platform.parameters.field.key")}
            htmlFor="param_key"
            error={errors.key?.message}
          >
            <Input
              id="param_key"
              placeholder={t("platform.parameters.placeholder.key")}
              aria-invalid={Boolean(errors.key)}
              disabled={!!editingParam}
              className="font-mono uppercase"
              autoComplete="off"
              {...register("key", {
                onChange: (event) => {
                  event.target.value = event.target.value
                    .toUpperCase()
                    .replace(/\s+/g, "_")
                },
              })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label={t("platform.parameters.field.value_type")}
              htmlFor="param_value_type"
              error={errors.value_type?.message}
            >
              <Controller
                control={control}
                name="value_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(selectedValue) => {
                      field.onChange(selectedValue)
                      setValue("value", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  >
                    <SelectTrigger
                      id="param_value_type"
                      aria-invalid={Boolean(errors.value_type)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {valueTypeValues.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`platform.parameters.value_type.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField
              label={t("platform.parameters.field.scope")}
              htmlFor="param_scope_type"
              error={errors.scope_type?.message}
            >
              <Controller
                control={control}
                name="scope_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(selectedValue) => {
                      field.onChange(selectedValue)
                      setValue("scope_id", "", {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  >
                    <SelectTrigger
                      id="param_scope_type"
                      aria-invalid={Boolean(errors.scope_type)}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeTypeValues.map((scope) => (
                        <SelectItem key={scope} value={scope}>
                          {t(`platform.parameters.scope_type.${scope}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          {scopeType !== "global" && (
            <FormField
              label={t("platform.parameters.field.scope_id")}
              htmlFor="param_scope_id"
              error={errors.scope_id?.message}
            >
              {scopeType === "org" ? (
                <Controller
                  control={control}
                  name="scope_id"
                  render={({ field }) => (
                    <Popover
                      open={orgSearchOpen}
                      onOpenChange={setOrgSearchOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={orgSearchOpen}
                          className="h-10 w-full justify-between text-left font-normal"
                        >
                          {field.value
                            ? orgs.find((org) => org.id === field.value)
                                ?.name || field.value
                            : t("platform.parameters.placeholder.org_select")}
                          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[450px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder={t(
                              "platform.parameters.placeholder.org_search"
                            )}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {t("platform.parameters.empty_orgs")}
                            </CommandEmpty>
                            <CommandGroup>
                              {orgs.map((org) => (
                                <CommandItem
                                  key={org.id}
                                  value={org.name}
                                  onSelect={() => {
                                    field.onChange(org.id)
                                    setOrgSearchOpen(false)
                                  }}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                      {org.name}
                                    </span>
                                    <span className="font-mono text-[10px] text-muted-foreground">
                                      {org.code}
                                    </span>
                                  </div>
                                  <Check
                                    className={cn(
                                      "size-4 text-primary",
                                      field.value === org.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                />
              ) : (
                <Input
                  id="param_scope_id"
                  placeholder={t("platform.parameters.placeholder.scope_id", {
                    scope: scopeType,
                  })}
                  aria-invalid={Boolean(errors.scope_id)}
                  autoComplete="off"
                  {...register("scope_id")}
                />
              )}
            </FormField>
          )}

          <FormField
            label={t("platform.parameters.field.value")}
            htmlFor="param_value"
            error={errors.value?.message}
          >
            {valueType === "boolean" ? (
              <div className="flex h-10 w-fit items-center rounded-lg border border-input bg-background p-0.5 px-1">
                <Button
                  type="button"
                  variant={value === "true" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-md text-xs"
                  onClick={() =>
                    setValue("value", "true", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  {t("platform.parameters.boolean.true")}
                </Button>
                <Button
                  type="button"
                  variant={value === "false" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 rounded-md text-xs"
                  onClick={() =>
                    setValue("value", "false", {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  {t("platform.parameters.boolean.false")}
                </Button>
              </div>
            ) : valueType === "json" ? (
              <Textarea
                id="param_value"
                placeholder={t("platform.parameters.placeholder.value_json")}
                className="font-mono"
                spellCheck={false}
                autoComplete="off"
                aria-invalid={Boolean(errors.value)}
                {...register("value")}
              />
            ) : valueType === "date" ? (
              <Input
                id="param_value"
                type="date"
                aria-invalid={Boolean(errors.value)}
                {...register("value")}
              />
            ) : (
              <Input
                id="param_value"
                placeholder={t("platform.parameters.placeholder.value")}
                spellCheck={false}
                autoComplete="off"
                aria-invalid={Boolean(errors.value)}
                {...register("value")}
              />
            )}
          </FormField>

          <FormField
            label={t("platform.parameters.field.description")}
            htmlFor="param_description"
            error={errors.description?.message}
          >
            <Input
              id="param_description"
              placeholder={t("platform.parameters.placeholder.description")}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={Boolean(errors.description)}
              {...register("description")}
            />
          </FormField>

          <Controller
            control={control}
            name="is_secret"
            render={({ field }) => (
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="param_is_secret"
                  checked={field.value}
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
                <label
                  htmlFor="param_is_secret"
                  className="cursor-pointer text-sm font-medium select-none"
                >
                  {t("platform.parameters.field.is_secret")}
                </label>
              </div>
            )}
          />

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
