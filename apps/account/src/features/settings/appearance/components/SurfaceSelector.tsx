import { Layout, PanelLeft } from "lucide-react"
import type { LayoutSurface } from "@workspace/theme/appearance"
import { cn } from "@workspace/ui/lib/utils"

interface SurfaceSelectorProps {
  headerSurface: LayoutSurface
  sidebarSurface: LayoutSurface
  onSelectHeaderSurface: (surface: LayoutSurface) => void
  onSelectSidebarSurface: (surface: LayoutSurface) => void
}

const surfaces: { key: LayoutSurface; label: string; desc: string }[] = [
  { key: "background", label: "Background", desc: "Seamless flush blend" },
  { key: "card", label: "Card", desc: "Raised solid panel" },
  { key: "muted", label: "Muted", desc: "Subdued soft surface" },
  { key: "sidebar", label: "Sidebar", desc: "Standard chrome tint" },
  { key: "accent", label: "Accent", desc: "Brand tint tone" },
]

export function SurfaceSelector({
  headerSurface,
  sidebarSurface,
  onSelectHeaderSurface,
  onSelectSidebarSurface,
}: SurfaceSelectorProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
          Layout Surfaces & Chrome
        </h2>
        <p className="text-xs text-muted-foreground">
          Define background elevation and tint for top navigation and sidebar
          drawers
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Header Surface */}
        <div className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-4">
          <div className="flex items-center gap-1.5">
            <Layout className="size-4 text-primary" />
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Top Header Surface
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {surfaces.map((s) => {
              const isSelected = headerSurface === s.key

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onSelectHeaderSurface(s.key)}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-2 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-2xs"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-xs font-semibold">{s.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {s.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sidebar Surface */}
        <div className="space-y-3 rounded-xl border border-border/70 bg-card/40 p-4">
          <div className="flex items-center gap-1.5">
            <PanelLeft className="size-4 text-primary" />
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Navigation Menu Surface
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {surfaces.map((s) => {
              const isSelected = sidebarSurface === s.key

              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onSelectSidebarSurface(s.key)}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-2 text-left transition-all",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-2xs"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="text-xs font-semibold">{s.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {s.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
