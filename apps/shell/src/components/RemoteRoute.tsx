import { Component, Suspense, type ReactNode } from "react"
import { useLocation } from "react-router-dom"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import { RouteLoading } from "@workspace/ui/components/route-loading"
import { retryFailedLazyLoads } from "@workspace/ui/lib/lazy"
import { reportBrowserError } from "@workspace/ui/observability/browser-telemetry"

class RemoteErrorBoundary extends Component<
  { children: ReactNode; resetKey: string; labels: { title: string; body: string; retry: string; reload: string } },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) {
    reportBrowserError({ kind: "remote-module", error, route: window.location.pathname })
  }
  componentDidUpdate(previous: { resetKey: string }) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.retry()
  }
  retry = () => {
    retryFailedLazyLoads()
    this.setState({ error: null })
  }
  render() {
    if (!this.state.error) return this.props.children
    const { labels } = this.props
    return (
      <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-4 p-6 text-center" role="alert">
        <h3 className="text-lg font-semibold">{labels.title}</h3>
        <p className="max-w-md text-sm text-muted-foreground">{labels.body}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={this.retry}>{labels.retry}</Button>
          <Button onClick={() => window.location.reload()}>{labels.reload}</Button>
        </div>
      </div>
    )
  }
}

export function RemoteRoute({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { t } = useI18n()
  const labels = {
    title: t("common.error.remote_load.title"),
    body: t("common.error.remote_load.body"),
    retry: t("common.error.remote_load.retry"),
    reload: t("common.error.remote_load.reload"),
  }
  return (
    <RemoteErrorBoundary resetKey={pathname} labels={labels}>
      <Suspense fallback={<RouteLoading />}>{children}</Suspense>
    </RemoteErrorBoundary>
  )
}
