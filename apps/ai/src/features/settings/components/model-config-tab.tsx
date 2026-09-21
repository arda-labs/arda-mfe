import { useCallback, useEffect, useMemo, useState } from "react"
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
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { RadioGroup } from "@workspace/ui/components/radio-group"
import { cn } from "@workspace/ui/lib/utils"
import { AlertCircle, CheckCircle2, Cpu, Plus } from "lucide-react"
import { deleteProfile, fetchProfiles, type AIProfile } from "../api"
import { ProfileCard } from "./profile-card"
import { ProfileDialog } from "./profile-dialog"

interface ProfileSelection {
  profileId: string
  modelId: string
}

/** Last-used model of a profile (the stale `isActive` flag) or its first. */
function defaultModelFor(profile: AIProfile): string {
  return (
    profile.models.find((model) => model.isActive)?.modelId ??
    profile.models[0]?.modelId ??
    ""
  )
}

const emptySelection: ProfileSelection = { profileId: "", modelId: "" }

export function ModelConfigTab() {
  const { t } = useI18n()
  const [profiles, setProfiles] = useState<AIProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selection, setSelection] = useState<ProfileSelection>(emptySelection)
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

  // Keep the staged profile/model valid as profiles are added, edited or
  // removed; fall back to the tenant's applied configuration first.
  useEffect(() => {
    setSelection((prev) => {
      const current = profiles.find((p) => p.id === prev.profileId)
      if (current) {
        if (current.models.some((m) => m.modelId === prev.modelId)) return prev
        return { profileId: current.id, modelId: defaultModelFor(current) }
      }
      const fallback = profiles.find((p) => p.isActive) ?? profiles[0]
      if (!fallback) return emptySelection
      return { profileId: fallback.id, modelId: defaultModelFor(fallback) }
    })
  }, [profiles])

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.isActive) ?? null,
    [profiles]
  )
  const appliedModelId = useMemo(
    () =>
      activeProfile?.models.find((model) => model.isActive)?.modelId ?? null,
    [activeProfile]
  )

  const selectProfile = (profileId: string) => {
    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) return
    setSelection({ profileId, modelId: defaultModelFor(profile) })
  }

  const selectModel = (profileId: string, modelId: string) => {
    setSelection({ profileId, modelId })
  }

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
        <CardContent className="pt-0">
          <div
            className={cn(
              "flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs",
              activeProfile && appliedModelId
                ? "border-success/30 bg-success/5"
                : "border-dashed bg-muted/40"
            )}
          >
            {activeProfile && appliedModelId ? (
              <>
                <CheckCircle2 className="size-3.5 shrink-0 text-success" />
                <span className="text-muted-foreground">
                  {t("ai.settings.profiles.summary.label")}
                </span>
                <span className="font-medium">{activeProfile.name}</span>
                <span className="text-muted-foreground">·</span>
                <code className="font-mono text-[11px]">
                  {appliedModelId}
                </code>
              </>
            ) : (
              <>
                <AlertCircle className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t("ai.settings.profiles.summary.empty")}
                </span>
              </>
            )}
          </div>
        </CardContent>
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
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
              1
            </span>
            {t("ai.settings.profiles.step.profile")}
          </div>
          <RadioGroup
            value={selection.profileId}
            onValueChange={selectProfile}
            className="gap-3"
          >
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                isSelected={selection.profileId === profile.id}
                selectedModelId={
                  selection.profileId === profile.id ? selection.modelId : ""
                }
                appliedModelId={
                  activeProfile?.id === profile.id ? appliedModelId : null
                }
                onSelectModel={selectModel}
                onChanged={load}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </RadioGroup>
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
