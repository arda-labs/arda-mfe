import { useEffect, useMemo, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
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
import { Loader2 } from "lucide-react"
import {
  addProfileModels,
  fetchAvailableModels,
  type AIApiFormat,
  type AIAvailableModel,
  type AIProfile,
} from "../api"
import { API_FORMAT_PATH } from "../formats"

/**
 * Lists the models a profile's endpoint advertises so they can be added
 * without retyping IDs. A suggested format that differs from the profile's is
 * stored as that model's own override.
 */
export function AvailableModelsDialog({
  open,
  onOpenChange,
  profile,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: AIProfile
  onAdded: () => Promise<void>
}) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [models, setModels] = useState<AIAvailableModel[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    setLoading(true)
    setError("")
    setSelected(new Set())
    setFilter("")
    fetchAvailableModels(profile.id)
      .then((result) => {
        if (!active) return
        setModels(result.models ?? [])
        setError(result.error ?? "")
      })
      .catch((err) => {
        if (!active) return
        setModels([])
        setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [open, profile.id])

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    return needle
      ? models.filter((m) => m.modelId.toLowerCase().includes(needle))
      : models
  }, [models, filter])

  const toggle = (modelId: string) =>
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(modelId)) next.delete(modelId)
      else next.add(modelId)
      return next
    })

  const submit = async () => {
    const chosen = models.filter((m) => selected.has(m.modelId))
    if (chosen.length === 0) return
    // Only a format that differs from the profile's needs an override.
    const formats: Record<string, AIApiFormat> = {}
    for (const model of chosen) {
      if (model.suggestedApiFormat !== profile.apiFormat) {
        formats[model.modelId] = model.suggestedApiFormat
      }
    }
    setSaving(true)
    try {
      await addProfileModels(
        profile.id,
        chosen.map((m) => m.modelId),
        formats
      )
      notify.success(t("ai.settings.profiles.toast_models_added"))
      onOpenChange(false)
      await onAdded()
    } catch (err) {
      notify.error(
        t("ai.settings.profiles.toast.model_add_failed"),
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
            {t("ai.settings.profiles.available.title")} · {profile.name}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {t("ai.settings.profiles.available.description")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div
            role="status"
            className="flex items-center gap-2 py-6 text-xs text-muted-foreground"
          >
            <Loader2 className="size-4 animate-spin" />
            {t("ai.settings.profiles.available.loading")}
          </div>
        ) : error ? (
          <div role="alert" className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
            <p className="font-medium">
              {t("ai.settings.profiles.available.failed")}
            </p>
            <p className="break-words font-mono text-[11px] text-muted-foreground">
              {error}
            </p>
          </div>
        ) : models.length === 0 ? (
          <p className="py-4 text-xs text-muted-foreground">
            {t("ai.settings.profiles.available.empty")}
          </p>
        ) : (
          <div className="space-y-2">
            <Input
              className="h-8 text-xs"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t("ai.settings.profiles.available.filter")}
            />
            <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {visible.map((model) => (
                <li key={model.modelId}>
                  <label
                    className={
                      "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs " +
                      (model.added
                        ? "opacity-60"
                        : "cursor-pointer hover:bg-muted/50")
                    }
                  >
                    <input
                      type="checkbox"
                      className="size-3.5"
                      disabled={model.added}
                      checked={model.added || selected.has(model.modelId)}
                      onChange={() => toggle(model.modelId)}
                    />
                    <span className="font-mono text-[11px]">
                      {model.modelId}
                    </span>
                    <Badge
                      variant="secondary"
                      className="ml-auto font-mono text-[10px]"
                    >
                      {API_FORMAT_PATH[model.suggestedApiFormat]}
                    </Badge>
                    {model.added && (
                      <Badge variant="outline" className="text-[10px]">
                        {t("ai.settings.profiles.available.added")}
                      </Badge>
                    )}
                  </label>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-muted-foreground">
              {t("ai.settings.profiles.available.hint")}
            </p>
          </div>
        )}

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
            disabled={saving || selected.size === 0}
            onClick={submit}
          >
            {saving
              ? t("common.action.saving")
              : t("ai.settings.profiles.available.add", {
                  count: selected.size,
                })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
