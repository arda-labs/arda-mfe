import { Check, Laptop, Moon, Sun } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"

type ThemeMode = "light" | "dark" | "system"

interface ThemeModeSelectorProps {
  value: ThemeMode
  onChange: (value: ThemeMode) => void
}

const themeOptions: {
  value: ThemeMode
  label: string
  desc: string
  icon: typeof Sun
}[] = [
  {
    value: "light",
    label: "Light",
    desc: "Crisp, daylight optimized palette with sharp contrast",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    desc: "Focused, deep surface palette reducing eye strain",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    desc: "Dynamically adapts to your operating system preference",
    icon: Laptop,
  },
]

export function ThemeModeSelector({ value, onChange }: ThemeModeSelectorProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
            Interface Theme
          </h2>
          <p className="text-xs text-muted-foreground">
            Select the overall visual theme for your account experience
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {themeOptions.map((opt) => {
          const Icon = opt.icon
          const isSelected = value === opt.value

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-200 hover:border-primary/50 hover:shadow-sm",
                isSelected
                  ? "border-primary bg-primary/[0.04] ring-2 ring-primary/20"
                  : "border-border/70 bg-card/60"
              )}
            >
              {/* Miniature frame illustration */}
              <div
                className={cn(
                  "relative flex h-20 w-full overflow-hidden rounded-xl border p-2 shadow-inner transition-colors",
                  opt.value === "light" && "border-zinc-200 bg-white",
                  opt.value === "dark" && "border-zinc-800 bg-zinc-950",
                  opt.value === "system" &&
                    "border-zinc-300 bg-gradient-to-r from-white via-zinc-100 to-zinc-900"
                )}
              >
                {/* Mini mock layout */}
                <div className="flex h-full w-full gap-1.5">
                  <div
                    className={cn(
                      "w-1/4 rounded-md border",
                      opt.value === "light" && "border-zinc-200 bg-zinc-100",
                      opt.value === "dark" && "border-zinc-800 bg-zinc-900",
                      opt.value === "system" && "border-zinc-300 bg-zinc-200/80"
                    )}
                  />
                  <div className="flex flex-1 flex-col gap-1.5">
                    <div
                      className={cn(
                        "h-3 w-full rounded-md border",
                        opt.value === "light" && "border-zinc-200 bg-zinc-100",
                        opt.value === "dark" && "border-zinc-800 bg-zinc-900",
                        opt.value === "system" &&
                          "border-zinc-300 bg-zinc-200/80"
                      )}
                    />
                    <div
                      className={cn(
                        "h-full w-full rounded-md border p-1",
                        opt.value === "light" && "border-zinc-200 bg-zinc-50",
                        opt.value === "dark" &&
                          "border-zinc-800 bg-zinc-900/60",
                        opt.value === "system" &&
                          "border-zinc-400/30 bg-zinc-100/60"
                      )}
                    >
                      <div className="h-1.5 w-1/2 rounded bg-primary/40" />
                    </div>
                  </div>
                </div>

                {isSelected && (
                  <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Check className="size-3" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-lg border text-muted-foreground transition-colors",
                    isSelected
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border/60 bg-muted/30"
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {opt.label}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {opt.desc}
              </p>
            </button>
          )
        })}
      </div>
    </section>
  )
}
