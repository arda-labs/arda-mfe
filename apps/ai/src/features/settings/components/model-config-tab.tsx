import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"
import {
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  Pencil,
  PlugZap,
  Plus,
  Trash2,
} from "lucide-react"
import {
  addProfileModels,
  applyProfileModel,
  createProfile,
  deleteProfile,
  deleteProfileModel,
  fetchProfiles,
  testProfileModel,
  updateProfile,
  type AIProfile,
} from "../api"

type ProfileForm = {
  name: string
  baseUrl: string
  apiKey: string
  models: string
}

const emptyForm: ProfileForm = { name: "", baseUrl: "", apiKey: "", models: "" }

export function ModelConfigTab() {
  const { t } = useI18n()
  const [profiles, setProfiles] = useState<AIProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AIProfile | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AIProfile | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const load = useCallback(async () => {
    try {
      setProfiles(await fetchProfiles())
    } catch {
      // Leave the list empty; the user creates the first profile.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (profile: AIProfile) => {
    setEditing(profile)
    setDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeletePending(true)
    try {
      await deleteProfile(deleteTarget.id)
      notify.success(t("ai.settings.profiles.toast.deleted"))
      setDeleteTarget(null)
      await load()
    } catch (err) {
      notify.error(
        t("ai.settings.profiles.toast.delete_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  {t("ai.settings.profiles.title")}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {t("ai.settings.profiles.description")}
              </CardDescription>
            </div>
            <Button size="sm" className="gap-1.5 text-xs" onClick={openCreate}>
              <Plus className="size-3.5" />
              {t("ai.settings.profiles.btn.add")}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <p className="text-xs text-muted-foreground">
          {t("ai.settings.profiles.loading")}
        </p>
      ) : profiles.length === 0 ? (
        <Card className="border-dashed shadow-xs">
          <CardContent className="py-8 text-center text-xs text-muted-foreground">
            {t("ai.settings.profiles.empty")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              onChanged={load}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <ProfileDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={load}
      />

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("ai.settings.profiles.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("ai.settings.profiles.delete.description", {
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              {t("common.action.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletePending}
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {t("common.action.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ProfileCard({
  profile,
  onChanged,
  onEdit,
  onDelete,
}: {
  profile: AIProfile
  onChanged: () => Promise<void>
  onEdit: (profile: AIProfile) => void
  onDelete: (profile: AIProfile) => void
}) {
  const { t } = useI18n()
  const [newModel, setNewModel] = useState("")
  const [adding, setAdding] = useState(false)
  const [busyModel, setBusyModel] = useState("")
  const [testResult, setTestResult] = useState<Record<string, string>>({})

  const handleAddModel = async () => {
    const value = newModel.trim()
    if (!value) return
    setAdding(true)
    try {
      await addProfileModels(profile.id, [value])
      setNewModel("")
      await onChanged()
    } catch (err) {
      notify.error(
        t("ai.settings.profiles.toast.model_add_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setAdding(false)
    }
  }

  const handleApply = async (modelId: string) => {
    setBusyModel(modelId)
    try {
      await applyProfileModel(profile.id, modelId)
      notify.success(
        t("ai.settings.profiles.toast.applied", { model: modelId })
      )
      await onChanged()
    } catch (err) {
      notify.error(
        t("ai.settings.profiles.toast.apply_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setBusyModel("")
    }
  }

  const handleDeleteModel = async (modelId: string) => {
    setBusyModel(modelId)
    try {
      await deleteProfileModel(profile.id, modelId)
      await onChanged()
    } catch (err) {
      notify.error(
        t("ai.settings.profiles.toast.model_delete_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setBusyModel("")
    }
  }

  const handleTest = async (modelId: string) => {
    setBusyModel(modelId)
    setTestResult((prev) => ({ ...prev, [modelId]: "" }))
    try {
      const res = await testProfileModel(profile.id, modelId)
      setTestResult((prev) => ({
        ...prev,
        [modelId]: res.success
          ? t("ai.settings.profiles.test.success", { latency: res.latencyMs ?? 0 })
          : res.error || t("ai.settings.profiles.test.failed"),
      }))
    } catch (err) {
      setTestResult((prev) => ({
        ...prev,
        [modelId]: err instanceof Error ? err.message : String(err),
      }))
    } finally {
      setBusyModel("")
    }
  }

  return (
    <Card className={`shadow-xs ${profile.isActive ? "border-primary/50" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="truncate text-sm font-semibold">
                {profile.name}
              </CardTitle>
              {profile.isActive && (
                <Badge variant="default" className="gap-1 text-[10px]">
                  <CheckCircle2 className="size-3" />
                  {t("ai.settings.profiles.applied")}
                </Badge>
              )}
            </div>
            <CardDescription className="truncate font-mono text-[11px]">
              {profile.baseUrl}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => onEdit(profile)}
              aria-label={t("common.action.edit")}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-destructive"
              onClick={() => onDelete(profile)}
              aria-label={t("common.action.delete")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0 text-xs">
        {profile.models.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {t("ai.settings.profiles.no_models")}
          </p>
        ) : (
          profile.models.map((model) => (
            <div
              key={model.id}
              className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5"
            >
              <span className="font-mono text-[11px]">{model.modelId}</span>
              {model.isActive && (
                <Badge variant="secondary" className="text-[10px]">
                  {t("ai.settings.profiles.active_model")}
                </Badge>
              )}
              {testResult[model.modelId] && (
                <span className="text-[10px] text-muted-foreground">
                  {testResult[model.modelId]}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-[11px]"
                  disabled={busyModel === model.modelId}
                  onClick={() => handleTest(model.modelId)}
                >
                  <PlugZap className="size-3" />
                  {t("ai.settings.profiles.btn.test")}
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-[11px]"
                  disabled={model.isActive || busyModel === model.modelId}
                  onClick={() => handleApply(model.modelId)}
                >
                  {t("ai.settings.profiles.btn.apply")}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 text-destructive"
                  disabled={model.isActive || busyModel === model.modelId}
                  onClick={() => handleDeleteModel(model.modelId)}
                  aria-label={t("common.action.delete")}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}

        <div className="flex items-center gap-2 pt-1">
          <Input
            className="h-8 max-w-xs text-xs font-mono"
            value={newModel}
            onChange={(e) => setNewModel(e.target.value)}
            placeholder={t("ai.settings.profiles.placeholder.model_id")}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void handleAddModel()
              }
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            disabled={adding || newModel.trim() === ""}
            onClick={handleAddModel}
          >
            <Plus className="size-3.5" />
            {t("ai.settings.profiles.btn.add_model")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ProfileDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: AIProfile | null
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const [form, setForm] = useState<ProfileForm>(emptyForm)
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        name: editing.name,
        baseUrl: editing.baseUrl,
        apiKey: editing.apiKey ?? "",
        models: "",
      })
    } else {
      setForm(emptyForm)
    }
    setShowKey(false)
  }, [open, editing])

  const submit = async () => {
    const name = form.name.trim()
    const baseUrl = form.baseUrl.trim()
    const apiKey = form.apiKey.trim()
    if (!name || !baseUrl || (!editing && !apiKey)) {
      notify.error(t("ai.settings.profiles.validation.required"))
      return
    }
    const models = form.models
      .split(/[\n,]+/)
      .map((m) => m.trim())
      .filter(Boolean)
    setSaving(true)
    try {
      if (editing) {
        await updateProfile(editing.id, { name, baseUrl, apiKey })
        notify.success(t("ai.settings.profiles.toast.updated"))
      } else {
        await createProfile({ name, baseUrl, apiKey, models })
        notify.success(t("ai.settings.profiles.toast.created"))
      }
      onOpenChange(false)
      await onSaved()
    } catch (err) {
      notify.error(
        t("ai.settings.profiles.toast.save_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {editing
              ? t("ai.settings.profiles.dialog.edit_title")
              : t("ai.settings.profiles.dialog.create_title")}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("ai.settings.profiles.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-xs">
          <div className="space-y-1.5">
            <Label className="text-xs">
              {t("ai.settings.profiles.field.name")}
            </Label>
            <Input
              className="h-8 text-xs"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder={t("ai.settings.profiles.placeholder.name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              {t("ai.settings.profiles.field.base_url")}
            </Label>
            <Input
              className="h-8 font-mono text-xs"
              value={form.baseUrl}
              onChange={(e) =>
                setForm((p) => ({ ...p, baseUrl: e.target.value }))
              }
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              {t("ai.settings.profiles.field.api_key")}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type={showKey ? "text" : "password"}
                className="h-8 font-mono text-xs"
                value={form.apiKey}
                onChange={(e) =>
                  setForm((p) => ({ ...p, apiKey: e.target.value }))
                }
                placeholder={
                  editing?.hasApiKey
                    ? t("ai.settings.model.placeholder.api_key_existing")
                    : "sk-..."
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setShowKey((p) => !p)}
                aria-label={
                  showKey
                    ? t("ai.settings.model.btn.hide_key")
                    : t("ai.settings.model.btn.show_key")
                }
              >
                {showKey ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </Button>
            </div>
            {editing?.hasApiKey && (
              <p className="text-[10px] text-muted-foreground">
                {t("ai.settings.model.api_key_saved")}
              </p>
            )}
          </div>

          {!editing && (
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t("ai.settings.profiles.field.models")}
              </Label>
              <Textarea
                className="min-h-[72px] font-mono text-xs"
                value={form.models}
                onChange={(e) =>
                  setForm((p) => ({ ...p, models: e.target.value }))
                }
                placeholder={t("ai.settings.profiles.placeholder.models")}
              />
              <p className="text-[10px] text-muted-foreground">
                {t("ai.settings.profiles.field.models_hint")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            {t("common.action.cancel")}
          </Button>
          <Button
            size="sm"
            className="text-xs"
            disabled={saving}
            onClick={submit}
          >
            {saving ? t("common.action.saving") : t("common.action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
