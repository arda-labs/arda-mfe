import { useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Textarea } from "@workspace/ui/components/textarea"
import { Eye, EyeOff } from "lucide-react"
import {
  createProfile,
  updateProfile,
  type AIProfile,
  type AIProviderType,
} from "../api"

export type ProfileForm = {
  name: string
  providerType: AIProviderType
  baseUrl: string
  apiKey: string
  models: string
}

const providerPresets: Array<{ value: AIProviderType; defaultURL: string }> = [
  { value: "openai", defaultURL: "https://api.openai.com/v1" },
  { value: "opencode-go", defaultURL: "https://opencode.ai/zen/go/v1" },
  { value: "ollama", defaultURL: "http://localhost:11434/v1" },
  { value: "vllm", defaultURL: "http://vllm.internal:8000/v1" },
  { value: "openai-compatible", defaultURL: "" },
]

const emptyForm: ProfileForm = {
  name: "",
  providerType: "openai",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  models: "",
}

export function ProfileDialog({
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
        providerType: editing.providerType || "openai-compatible",
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
        await updateProfile(editing.id, {
          name,
          providerType: form.providerType,
          baseUrl,
          apiKey,
        })
        notify.success(t("ai.settings.profiles.toast.updated"))
      } else {
        await createProfile({
          name,
          providerType: form.providerType,
          baseUrl,
          apiKey,
          models,
        })
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
              {t("ai.settings.profiles.field.provider")}
            </Label>
            <Select
              value={form.providerType}
              onValueChange={(value) => {
                const preset = providerPresets.find(
                  (item) => item.value === value
                )
                setForm((current) => ({
                  ...current,
                  providerType: value as AIProviderType,
                  baseUrl: preset?.defaultURL ?? current.baseUrl,
                }))
              }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providerPresets.map((preset) => (
                  <SelectItem
                    key={preset.value}
                    value={preset.value}
                    className="text-xs"
                  >
                    {t(`ai.settings.profiles.provider.${preset.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {t(`ai.settings.profiles.provider_hint.${form.providerType}`)}
            </p>
          </div>

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
