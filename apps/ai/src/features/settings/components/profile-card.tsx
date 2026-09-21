import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group"
import { cn } from "@workspace/ui/lib/utils"
import { CheckCircle2, Pencil, PlugZap, Plus, Trash2 } from "lucide-react"
import {
  addProfileModels,
  applyProfileModel,
  deleteProfileModel,
  testProfileModel,
  type AIProfile,
} from "../api"

interface ProfileCardProps {
  profile: AIProfile
  /** The profile currently staged for apply (single-step selection). */
  isSelected: boolean
  /** Staged model id; empty when this profile is not selected. */
  selectedModelId: string
  /** Applied model id when this profile is the tenant's active one. */
  appliedModelId: string | null
  onSelectModel: (profileId: string, modelId: string) => void
  onChanged: () => Promise<void>
  onEdit: (profile: AIProfile) => void
  onDelete: (profile: AIProfile) => void
}

export function ProfileCard({
  profile,
  isSelected,
  selectedModelId,
  appliedModelId,
  onSelectModel,
  onChanged,
  onEdit,
  onDelete,
}: ProfileCardProps) {
  const { t } = useI18n()
  const [newModel, setNewModel] = useState("")
  const [adding, setAdding] = useState(false)
  const [busyModel, setBusyModel] = useState("")
  const [applying, setApplying] = useState(false)
  const [testResult, setTestResult] = useState<Record<string, string>>({})

  const isAppliedProfile = profile.isActive
  const isAppliedSelection =
    isAppliedProfile && appliedModelId === selectedModelId && isSelected

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

  const handleApply = async () => {
    if (!selectedModelId) return
    setApplying(true)
    try {
      await applyProfileModel(profile.id, selectedModelId)
      notify.success(
        t("ai.settings.profiles.toast.applied", { model: selectedModelId })
      )
      await onChanged()
    } catch (err) {
      notify.error(
        t("ai.settings.profiles.toast.apply_failed"),
        err instanceof Error ? err.message : String(err)
      )
    } finally {
      setApplying(false)
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
    <Card
      className={cn(
        "shadow-xs transition-colors",
        isSelected
          ? "border-primary/70 ring-1 ring-primary/25"
          : isAppliedProfile
            ? "border-primary/40"
            : undefined
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <RadioGroupItem
              value={profile.id}
              id={`ai-profile-${profile.id}`}
              className="mt-0.5"
              aria-label={profile.name}
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor={`ai-profile-${profile.id}`}
                  className="cursor-pointer truncate text-sm font-semibold"
                >
                  {profile.name}
                </label>
                <Badge variant="outline" className="text-[10px]">
                  {t(`ai.settings.profiles.provider.${profile.providerType}`)}
                </Badge>
                {isAppliedProfile && (
                  <Badge variant="success" className="gap-1 text-[10px]">
                    <CheckCircle2 className="size-3" />
                    {t("ai.settings.profiles.applied")}
                  </Badge>
                )}
              </div>
              <CardDescription className="truncate font-mono text-[11px]">
                {profile.baseUrl}
              </CardDescription>
              {!isSelected && (
                <p className="text-[10px] text-muted-foreground">
                  {t("ai.settings.profiles.select_hint")}
                </p>
              )}
            </div>
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
          <RadioGroup
            value={isSelected ? selectedModelId : ""}
            onValueChange={(value) => onSelectModel(profile.id, value)}
            disabled={!isSelected}
            className="gap-1.5"
          >
            {profile.models.map((model) => {
              const isAppliedModel =
                isAppliedProfile && appliedModelId === model.modelId
              const isChosen = isSelected && selectedModelId === model.modelId
              return (
                <div
                  key={model.id}
                  className={cn(
                    "flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors",
                    isChosen && "border-primary/50 bg-primary/5",
                    !isSelected && "opacity-70"
                  )}
                >
                  <RadioGroupItem
                    value={model.modelId}
                    id={`ai-model-${profile.id}-${model.id}`}
                    disabled={!isSelected}
                    aria-label={model.modelId}
                  />
                  <label
                    htmlFor={`ai-model-${profile.id}-${model.id}`}
                    className={cn(
                      "font-mono text-[11px]",
                      isSelected && "cursor-pointer"
                    )}
                  >
                    {model.modelId}
                  </label>
                  {isAppliedModel && (
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
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      disabled={isAppliedModel || busyModel === model.modelId}
                      onClick={() => handleDeleteModel(model.modelId)}
                      aria-label={t("common.action.delete")}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </RadioGroup>
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

        {isSelected && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
            <span className="text-[10px] text-muted-foreground">
              {selectedModelId
                ? t("ai.settings.profiles.step.model")
                : t("ai.settings.profiles.no_model_selected")}
            </span>
            <Button
              size="sm"
              className="h-7 gap-1.5 text-[11px]"
              disabled={!selectedModelId || isAppliedSelection || applying}
              onClick={handleApply}
            >
              {isAppliedSelection ? (
                <>
                  <CheckCircle2 className="size-3" />
                  {t("ai.settings.profiles.applied")}
                </>
              ) : applying ? (
                t("common.action.saving")
              ) : (
                t("ai.settings.profiles.btn.apply_config")
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
