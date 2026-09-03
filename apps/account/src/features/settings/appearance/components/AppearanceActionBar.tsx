import { AlertCircle, Check, RotateCcw } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

interface AppearanceActionBarProps {
  isDirty: boolean
  saveFeedback: string | null
  onApply: () => void
  onDiscard: () => void
  onResetToDefault: () => void
}

export function AppearanceActionBar({
  isDirty,
  saveFeedback,
  onApply,
  onDiscard,
  onResetToDefault,
}: AppearanceActionBarProps) {
  return (
    <>
      {/* Save feedback banner */}
      {saveFeedback && (
        <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-600 shadow-lg backdrop-blur-md dark:text-emerald-400">
          <Check className="size-4" />
          <span>{saveFeedback}</span>
        </div>
      )}

      {/* Floating Sticky Action Bar */}
      <div
        className={cn(
          "sticky bottom-4 z-40 mx-auto mt-6 flex w-full max-w-4xl items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/95 p-3.5 shadow-xl backdrop-blur-xl transition-all duration-300",
          isDirty
            ? "translate-y-0 opacity-100 ring-2 ring-primary/20"
            : "pointer-events-none translate-y-4 opacity-0"
        )}
      >
        <div className="flex items-center gap-2.5 pl-1">
          <span className="relative flex size-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-amber-500" />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-foreground">
              Unsaved Appearance Changes
            </span>
            <span className="text-[11px] text-muted-foreground">
              Your preview contains custom edits that have not been applied yet
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetToDefault}
            className="h-9 gap-1.5 rounded-xl px-3 text-xs text-muted-foreground hover:text-foreground"
            title="Reset system theme to original factory defaults"
          >
            <RotateCcw className="size-3.5" />
            Defaults
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onDiscard}
            className="h-9 rounded-xl px-4 text-xs font-semibold"
          >
            Discard
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={onApply}
            className="h-9 gap-1.5 rounded-xl px-5 text-xs font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.02]"
          >
            <Check className="size-3.5" />
            Apply Changes
          </Button>
        </div>
      </div>
    </>
  )
}
