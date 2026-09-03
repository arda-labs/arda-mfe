import { useMemo, useState } from "react"
import {
  ArrowUpRight,
  Check,
  Code,
  Copy,
  CreditCard,
  Eye,
  Layers,
  LayoutGrid,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  TrendingUp,
  User,
} from "lucide-react"
import {
  baseColors,
  chartPalettes,
  fontPresets,
  layoutSurfacePresets,
  radiusPresets,
} from "@workspace/theme/appearance"
import type { AppearanceSettings } from "@workspace/theme/appearance"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

interface AppearancePreviewProps {
  settings: AppearanceSettings
  previewTheme: "light" | "dark"
  onTogglePreviewTheme: (theme: "light" | "dark") => void
}

type PreviewTab = "dashboard" | "cards" | "code"

export function AppearancePreview({
  settings,
  previewTheme,
  onTogglePreviewTheme,
}: AppearancePreviewProps) {
  const [activeTab, setActiveTab] = useState<PreviewTab>("dashboard")
  const [copied, setCopied] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card")
  const [allowTelemetry, setAllowTelemetry] = useState(true)
  const [allowMarketing, setAllowMarketing] = useState(false)

  // Compute scoped CSS variables directly on the preview sandbox
  const scopedStyle = useMemo(() => {
    const base = baseColors[settings.baseColor] ?? baseColors.arda
    const baseVars = previewTheme === "dark" ? base.dark : base.light
    const charts = chartPalettes[settings.chartPalette] ?? chartPalettes.default
    const fontStack =
      fontPresets[settings.font]?.stack ?? fontPresets.inter.stack
    const headingStack =
      fontPresets[settings.headingFont]?.stack ?? fontPresets.inter.stack
    const radiusVal =
      radiusPresets[settings.radius]?.value ?? radiusPresets.md.value

    const styles: Record<string, string> = {
      ...baseVars,
      "--radius": radiusVal,
      "--font-sans": fontStack,
      "--font-heading": headingStack,
      "--layout-header-background":
        layoutSurfacePresets[settings.headerSurface]?.value ??
        layoutSurfacePresets.background.value,
      "--layout-sidebar-background":
        layoutSurfacePresets[settings.sidebarSurface]?.value ??
        layoutSurfacePresets.sidebar.value,
    }

    charts.colors.forEach((color, idx) => {
      styles[`--chart-${idx + 1}`] = color
    })

    return styles as React.CSSProperties
  }, [settings, previewTheme])

  // Full Shadcn / Tailwind CSS variables export format
  const shadcnCssCode = useMemo(() => {
    const base = baseColors[settings.baseColor] ?? baseColors.arda
    const charts = chartPalettes[settings.chartPalette] ?? chartPalettes.default
    const radiusVal =
      radiusPresets[settings.radius]?.value ?? radiusPresets.md.value

    const lightLines = Object.entries(base.light)
      .map(([k, v]) => `    ${k}: ${v};`)
      .join("\n")
    const darkLines = Object.entries(base.dark)
      .map(([k, v]) => `    ${k}: ${v};`)
      .join("\n")
    const chartLines = charts.colors
      .map((c, i) => `    --chart-${i + 1}: ${c};`)
      .join("\n")

    return `@layer base {
  :root {
${lightLines}
    --radius: ${radiusVal};
${chartLines}
  }

  .dark {
${darkLines}
${chartLines}
  }
}`
  }, [settings])

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(shadcnCssCode)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <aside className="sticky top-6 flex flex-col gap-4">
      {/* Sandbox Header Control */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Eye className="size-4" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-foreground">
                Live Studio Preview
              </span>
              <Badge
                variant="outline"
                className="h-4 border-primary/30 bg-primary/5 px-1.5 text-[9px] font-semibold text-primary"
              >
                shadcn/ui
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Instant visual sandbox with current draft tokens
            </p>
          </div>
        </div>

        {/* Preview Theme and Tabs Controls */}
        <div className="flex items-center gap-1.5">
          {/* Light / Dark Sandbox Mode Switch */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => onTogglePreviewTheme("light")}
              className={cn(
                "flex size-6 items-center justify-center rounded-md text-xs transition-all",
                previewTheme === "light"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Preview in Light Mode"
            >
              <Sun className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onTogglePreviewTheme("dark")}
              className={cn(
                "flex size-6 items-center justify-center rounded-md text-xs transition-all",
                previewTheme === "dark"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Preview in Dark Mode"
            >
              <Moon className="size-3.5" />
            </button>
          </div>

          {/* View Tab switcher */}
          <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-all",
                activeTab === "dashboard"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="App Dashboard View"
            >
              <Layers className="size-3.5" />
              <span className="hidden text-[11px] sm:inline">App</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cards")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-all",
                activeTab === "cards"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Shadcn UI Showcase Cards"
            >
              <LayoutGrid className="size-3.5" />
              <span className="hidden text-[11px] sm:inline">Cards</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-all",
                activeTab === "code"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
              title="Shadcn Copy Code"
            >
              <Code className="size-3.5" />
              <span className="hidden text-[11px] sm:inline">Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Miniature App Dashboard View */}
      {activeTab === "dashboard" && (
        <div
          style={scopedStyle}
          className={cn(
            "overflow-hidden rounded-2xl border border-border/80 shadow-md transition-colors",
            previewTheme === "dark"
              ? "dark bg-zinc-950 text-zinc-100"
              : "bg-white text-zinc-900"
          )}
        >
          {/* Window Titlebar */}
          <div className="flex h-8 items-center justify-between border-b border-border/50 bg-muted/40 px-3">
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-red-400/80" />
              <span className="size-2.5 rounded-full bg-amber-400/80" />
              <span className="size-2.5 rounded-full bg-emerald-400/80" />
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              arda-workspace.local • {previewTheme}
            </span>
            <div className="size-2.5" />
          </div>

          {/* App Shell Miniature */}
          <div className="flex h-[460px]">
            {/* Sidebar */}
            <aside
              className="flex w-24 flex-col justify-between border-r border-border/50 p-2 text-[10px]"
              style={{
                backgroundColor:
                  "var(--layout-sidebar-background, var(--card))",
              }}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 px-1">
                  <div className="flex size-4.5 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                    A
                  </div>
                  <span
                    className="font-bold tracking-tight text-foreground"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    Arda
                  </span>
                </div>

                <nav className="space-y-1">
                  <div
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 font-semibold transition-colors"
                    style={{
                      backgroundColor: "var(--sidebar-primary, var(--primary))",
                      color:
                        "var(--sidebar-primary-foreground, var(--primary-foreground))",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <Layers className="size-3" />
                    <span>Overview</span>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground">
                    <CreditCard className="size-3" />
                    <span>Billing</span>
                  </div>

                  <div className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-colors hover:text-foreground">
                    <ShieldCheck className="size-3" />
                    <span>Security</span>
                  </div>
                </nav>
              </div>

              <div className="flex items-center gap-1 rounded-md border border-border/50 bg-muted/40 p-1">
                <div className="size-4 rounded-full bg-primary/20 text-center text-[8px] leading-4 font-bold text-primary">
                  JD
                </div>
                <span className="truncate text-[9px] text-muted-foreground">
                  j.doe
                </span>
              </div>
            </aside>

            {/* Main Content Area */}
            <main
              className="flex flex-1 flex-col overflow-y-auto"
              style={{
                backgroundColor:
                  "var(--layout-header-background, var(--background))",
              }}
            >
              {/* Header Bar */}
              <div className="flex h-10 items-center justify-between border-b border-border/50 px-3">
                <div className="flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-0.5 text-[9px] text-muted-foreground">
                  <Search className="size-2.5" />
                  <span>Search records...</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="flex size-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-medium text-muted-foreground">
                    Operational
                  </span>
                </div>
              </div>

              {/* Content Space */}
              <div className="space-y-3 p-3 text-[11px]">
                {/* KPI Card */}
                <div
                  className="space-y-2 rounded-xl border border-border/60 bg-card p-3 shadow-2xs"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                      Total Ledger Volume
                    </span>
                    <span className="flex items-center gap-0.5 rounded-md bg-emerald-500/10 px-1 py-0.5 text-[9px] font-bold text-emerald-500">
                      <TrendingUp className="size-2.5" />
                      +14.2%
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <span
                      className="text-base font-bold tracking-tight text-foreground"
                      style={{ fontFamily: "var(--font-heading)" }}
                    >
                      $2,485,200
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      USD • Live
                    </span>
                  </div>

                  {/* 5-Color Chart Bar Spectrum */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                      <span>Multi-channel allocation</span>
                      <span>5 channels</span>
                    </div>
                    <div className="flex h-3.5 w-full items-end gap-1">
                      {[65, 88, 45, 95, 70].map((height, idx) => (
                        <div
                          key={idx}
                          className="h-full flex-1 rounded-sm shadow-2xs transition-all hover:opacity-80"
                          style={{
                            height: `${height}%`,
                            background: `var(--chart-${idx + 1})`,
                            borderRadius: "calc(var(--radius) * 0.4)",
                          }}
                          title={`Channel ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Miniature Activity List */}
                <div
                  className="space-y-1.5 rounded-xl border border-border/60 bg-card/60 p-2.5"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                    Recent Operations
                  </span>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex items-center justify-between rounded p-1 hover:bg-muted/40">
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-primary" />
                        <span className="font-medium text-foreground">
                          Stripe Batch Settlement
                        </span>
                      </div>
                      <span className="font-mono text-muted-foreground">
                        +$42,150
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded p-1 hover:bg-muted/40">
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-emerald-500" />
                        <span className="font-medium text-foreground">
                          Cloud Infrastructure
                        </span>
                      </div>
                      <span className="font-mono text-muted-foreground">
                        -$3,240
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form & Controls Specimen */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    className="flex h-6 items-center gap-1 px-2.5 text-[10px] font-semibold text-primary-foreground shadow-2xs transition-all"
                    style={{
                      background: "var(--primary)",
                      borderRadius: "var(--radius)",
                    }}
                  >
                    <span>Execute</span>
                    <ArrowUpRight className="size-2.5" />
                  </button>

                  <button
                    type="button"
                    className="flex h-6 items-center border border-border/80 bg-background px-2.5 text-[10px] font-medium text-foreground transition-all"
                    style={{
                      borderRadius: "var(--radius)",
                    }}
                  >
                    Export
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      )}

      {/* Tab 2: Shadcn UI Component Showcase Cards */}
      {activeTab === "cards" && (
        <div
          style={scopedStyle}
          className={cn(
            "space-y-3.5 rounded-2xl border border-border/80 p-3 shadow-md transition-colors",
            previewTheme === "dark"
              ? "dark bg-zinc-950 text-zinc-100"
              : "bg-zinc-50/70 text-zinc-900"
          )}
        >
          {/* Card 1: Payment Method (Shadcn style) */}
          <Card
            className="border-border/70 shadow-sm"
            style={{ borderRadius: "var(--radius)" }}
          >
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-semibold">
                Payment Method
              </CardTitle>
              <CardDescription className="text-[10px]">
                Add a new payment method to your treasury account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 p-3.5 pt-0">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all",
                    paymentMethod === "card"
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                  )}
                  style={{ borderRadius: "calc(var(--radius) * 0.7)" }}
                >
                  <CreditCard className="size-4" />
                  <span className="text-[10px] font-semibold">Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod("paypal")}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border p-2 text-center transition-all",
                    paymentMethod === "paypal"
                      ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/20"
                      : "border-border/60 bg-card text-muted-foreground hover:text-foreground"
                  )}
                  style={{ borderRadius: "calc(var(--radius) * 0.7)" }}
                >
                  <User className="size-4" />
                  <span className="text-[10px] font-semibold">PayPal</span>
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">
                  Card Number
                </label>
                <div
                  className="flex h-7 w-full items-center rounded-md border border-input bg-background px-2 text-[11px] shadow-2xs"
                  style={{ borderRadius: "calc(var(--radius) * 0.6)" }}
                >
                  •••• •••• •••• 4242
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-3.5 pt-0">
              <Button
                size="sm"
                className="h-7 px-3 text-[11px] font-semibold"
                style={{ borderRadius: "calc(var(--radius) * 0.6)" }}
              >
                Continue
              </Button>
            </CardFooter>
          </Card>

          {/* Card 2: Cookie & Notification Settings (Shadcn style) */}
          <Card
            className="border-border/70 shadow-sm"
            style={{ borderRadius: "var(--radius)" }}
          >
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-xs font-semibold">
                Privacy & Workspace Settings
              </CardTitle>
              <CardDescription className="text-[10px]">
                Manage cookies and real-time telemetry updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-3.5 pt-0">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-foreground">
                    Performance Telemetry
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Collect latency metrics for high-speed routing.
                  </p>
                </div>
                <Switch
                  checked={allowTelemetry}
                  onCheckedChange={setAllowTelemetry}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[11px] font-medium text-foreground">
                    Release Broadcasts
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    Receive release highlights and API updates.
                  </p>
                </div>
                <Switch
                  checked={allowMarketing}
                  onCheckedChange={setAllowMarketing}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/40 p-3 pt-2.5">
              <Badge variant="outline" className="text-[9px]">
                Saved local
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[10px]"
                style={{ borderRadius: "calc(var(--radius) * 0.5)" }}
              >
                Reset
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Tab 3: Shadcn Copy Code View */}
      {activeTab === "code" && (
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-foreground">
                shadcn/ui CSS Variables
              </span>
              <p className="text-[10px] text-muted-foreground">
                Drop directly into your globals.css @layer base
              </p>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleCopyCode}
              className="h-7.5 gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="size-3.5 text-white" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  Copy Code
                </>
              )}
            </Button>
          </div>

          <pre className="max-h-[380px] overflow-auto rounded-xl border border-border/60 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-200">
            {shadcnCssCode}
          </pre>
        </div>
      )}
    </aside>
  )
}
