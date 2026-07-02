type AuthLoadingScreenProps = {
  fullscreen?: boolean
  label?: string
}

export function AuthLoadingScreen({
  fullscreen = true,
  label = "Securing workspace...",
}: AuthLoadingScreenProps) {
  const content = (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <div className="relative flex size-16 items-center justify-center">
        <div className="flex size-14 animate-pulse items-center justify-center rounded-2xl bg-primary text-xl font-bold text-primary-foreground shadow-lg shadow-primary/20">
          A
        </div>
        <div className="absolute inset-0 rounded-2xl border-2 border-primary/10" />
        <div className="absolute inset-0 animate-spin rounded-2xl border-2 border-transparent border-t-primary" />
      </div>

      <div className="space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight">Arda Secure Session</h1>
        <p className="mx-auto max-w-xs text-xs leading-relaxed text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  )

  if (!fullscreen) {
    return (
      <div className="flex min-h-64 items-center justify-center px-4 py-8 text-foreground">
        {content}
      </div>
    )
  }

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-6 text-foreground transition-colors duration-500 dark:bg-zinc-950"
      style={{ minHeight: "100dvh" }}
    >
      {content}
    </main>
  )
}
