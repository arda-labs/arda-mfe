import { useMemo, useRef, useState } from "react"
import { AlertCircle, Eye, RefreshCw, RotateCcw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Spinner } from "@workspace/ui/components/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"
import { notify } from "@workspace/notifications/notify"
import { workflowApi } from "../api"
import type { WorkflowCase, WorkflowCaseType } from "../api"
import { useProcessInstanceRuntime } from "../shared/use-process-instance-runtime"
import { BpmnViewerPanel } from "./bpmn-monitor-lazy"

type ProcessInstanceOperateProps = {
  cases: WorkflowCase[]
  caseTypes: WorkflowCaseType[]
  selected: WorkflowCase | undefined
  bpmnXml: string
  bpmnLoading?: boolean
  onSelect: (item: WorkflowCase) => void
}

export function ProcessInstanceOperate({
  cases,
  caseTypes,
  selected,
  bpmnXml,
  bpmnLoading,
  onSelect,
}: ProcessInstanceOperateProps) {
  const [dockTab, setDockTab] = useState("jobs")
  const [retryJobPending, setRetryJobPending] = useState<string | null>(null)
  const [retryServicePending, setRetryServicePending] = useState(false)
  const runtimeQuery = useProcessInstanceRuntime(selected?.processInstanceKey)
  const runtime = runtimeQuery.data
  const pendingJobs = runtime?.pendingJobs ?? []
  const incidents = runtime?.incidents ?? []
  const timeline = runtime?.timeline ?? []
  const highlightId = runtime?.activeElementId || selected?.currentStep
  const caseTypeNames = useMemo(
    () => new Map(caseTypes.map((item) => [item.caseType, item.operationName])),
    [caseTypes]
  )

  async function handleRetryJob(jobKey: string) {
    setRetryJobPending(jobKey)
    try {
      await workflowApi.retryWorkflowJob(jobKey)
      notify.success("Đã retry job", `Job ${jobKey} — worker sẽ xử lý lại`)
      await runtimeQuery.refetch()
    } catch (error) {
      notify.error("Retry thất bại", error instanceof Error ? error.message : "Lỗi không xác định")
    } finally {
      setRetryJobPending(null)
    }
  }

  async function handleRetryServiceJobs() {
    if (!selected?.processInstanceKey) return
    setRetryServicePending(true)
    try {
      const result = await workflowApi.retryProcessServiceJobs(String(selected.processInstanceKey))
      if (result.status === "noop") {
        notify.info("Không có incident service job", result.message)
      } else {
        notify.success("Đã retry service jobs", `Jobs: ${result.retried.join(", ")}`)
      }
      await runtimeQuery.refetch()
    } catch (error) {
      notify.error("Retry thất bại", error instanceof Error ? error.message : "Lỗi không xác định")
    } finally {
      setRetryServicePending(false)
    }
  }

  return (
    <div className="flex min-h-[40rem] flex-col gap-0 overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div>
          <p className="text-sm font-medium">Process instances</p>
          <p className="text-xs text-muted-foreground">
            Giám sát runtime kiểu Camunda Operate — BPMN, jobs, incidents, retry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected?.processInstanceKey || retryServicePending}
            onClick={handleRetryServiceJobs}
          >
            <RotateCcw className="size-4" />
            Retry service jobs
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!selected?.processInstanceKey || runtimeQuery.isFetching}
            onClick={() => runtimeQuery.refetch()}
          >
            <RefreshCw className={cn("size-4", runtimeQuery.isFetching && "animate-spin")} />
            Làm mới
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[17rem_minmax(0,1fr)_20rem]">
        <aside className="overflow-auto border-b lg:border-b-0 lg:border-r">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead>Instance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cases.map((item) => (
                <TableRow
                  key={item.id}
                  className={cn("cursor-pointer", item.id === selected?.id && "bg-muted/60")}
                  onClick={() => onSelect(item)}
                >
                  <TableCell>
                    <p className="font-mono text-xs">{item.caseCode}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {caseTypeNames.get(item.caseType) ?? item.caseType}
                    </p>
                  </TableCell>
                  <TableCell>
                    <OperateStatusBadge status={item.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </aside>

        <div className="min-h-[24rem] border-b lg:border-b-0 lg:border-r">
          {selected ? (
            <BpmnViewerPanel
              title={selected.title}
              xml={bpmnXml}
              highlightId={highlightId}
              loading={bpmnLoading}
              canvasClassName="min-h-[24rem]"
            />
          ) : (
            <div className="flex h-full min-h-[24rem] items-center justify-center text-sm text-muted-foreground">
              Chọn instance để xem BPMN
            </div>
          )}
        </div>

        <aside className="space-y-3 overflow-auto p-4">
          {selected ? (
            <OperateSidebar
              item={selected}
              runtime={runtime}
              loading={runtimeQuery.isLoading}
              error={runtimeQuery.error}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Chưa chọn instance.</p>
          )}
        </aside>
      </div>

      <div className="border-t bg-muted/10">
        <Tabs value={dockTab} onValueChange={setDockTab}>
          <div className="flex items-center justify-between border-b px-3 py-2">
            <TabsList className="h-9">
              <TabsTrigger value="jobs">Jobs ({pendingJobs.length})</TabsTrigger>
              <TabsTrigger value="incidents">Incidents ({incidents.length})</TabsTrigger>
              <TabsTrigger value="timeline">Timeline ({timeline.length})</TabsTrigger>
            </TabsList>
            <span className="font-mono text-xs text-muted-foreground">
              {selected?.processInstanceKey ? String(selected.processInstanceKey) : "—"}
            </span>
          </div>
          <TabsContent value="jobs" className="m-0 max-h-56 overflow-auto">
            {pendingJobs.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job type</TableHead>
                    <TableHead>Element</TableHead>
                    <TableHead>Job key</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingJobs.map((job) => (
                    <TableRow key={job.jobKey}>
                      <TableCell className="font-mono text-xs">{job.jobType}</TableCell>
                      <TableCell className="font-mono text-xs">{job.elementId}</TableCell>
                      <TableCell className="font-mono text-xs">{job.jobKey}</TableCell>
                      <TableCell>{job.retries}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={retryJobPending != null}
                          onClick={() => handleRetryJob(job.jobKey)}
                        >
                          <RotateCcw className="size-3.5" />
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">
                Không có job đang chờ trên Zeebe cho process này.
              </p>
            )}
          </TabsContent>
          <TabsContent value="incidents" className="m-0 max-h-56 overflow-auto">
            {incidents.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job type</TableHead>
                    <TableHead>Element</TableHead>
                    <TableHead>Lỗi</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((incident) => (
                    <TableRow key={`${incident.jobKey}-${incident.createdAt}`}>
                      <TableCell className="font-mono text-xs">{incident.jobType}</TableCell>
                      <TableCell className="font-mono text-xs">{incident.elementId}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-destructive">
                        {incident.errorMessage || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={retryJobPending != null}
                          onClick={() => handleRetryJob(incident.jobKey)}
                        >
                          <RotateCcw className="size-3.5" />
                          Retry
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Chưa ghi nhận incident (JOB_FAILED) cho case này.</p>
            )}
          </TabsContent>
          <TabsContent value="timeline" className="m-0 max-h-56 overflow-auto p-3">
            {timeline.length ? (
              <div className="space-y-2 text-xs">
                {timeline.map((event) => (
                  <div key={event.id} className="rounded border bg-background px-2 py-1.5">
                    <p className="font-medium">{event.eventType}</p>
                    <p className="text-muted-foreground">{formatOperateDateTime(event.createdAt)}</p>
                    {event.note ? <p className="mt-1 break-all font-mono">{event.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có timeline event.</p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function OperateSidebar({
  item,
  runtime,
  loading,
  error,
}: {
  item: WorkflowCase
  runtime?: import("../api").ProcessInstanceRuntime
  loading: boolean
  error: Error | null
}) {
  const domainHref = workflowDomainHref(item)

  return (
    <>
      <div>
        <p className="font-mono text-xs text-muted-foreground">{item.caseCode}</p>
        <h2 className="text-base font-semibold">{item.title}</h2>
      </div>
      {domainHref ? (
        <Button type="button" size="sm" variant="outline" onClick={() => navigateToOperate(domainHref)}>
          <Eye className="size-4" />
          Mở hồ sơ CRM
        </Button>
      ) : null}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Field label="Status" value={item.status} />
        <Field label="Bước DB" value={item.currentStep || "—"} />
        <Field label="Active BPMN" value={runtime?.activeElementId || "—"} />
        <Field label="Zeebe" value={runtime?.zeebeStatus ?? (loading ? "…" : "—")} />
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Đang quét Zeebe…
        </div>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Runtime lỗi</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      ) : null}
      {runtime ? (
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>Gợi ý</AlertTitle>
          <AlertDescription className="space-y-2 text-xs">
            <p>{runtime.hint}</p>
            <p className="text-muted-foreground">{runtime.workerNote}</p>
          </AlertDescription>
        </Alert>
      ) : null}
    </>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="break-words font-medium">{value}</p>
    </div>
  )
}

function OperateStatusBadge({ status }: { status: string }) {
  const tone =
    status === "COMPLETED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "IN_REVIEW" || status === "SUBMITTED"
        ? "bg-sky-100 text-sky-800"
        : status === "FAILED" || status === "INCIDENT"
          ? "bg-red-100 text-red-800"
          : "bg-muted text-muted-foreground"
  return <Badge className={tone}>{status}</Badge>
}

function formatOperateDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("vi-VN")
}

function workflowDomainHref(item: WorkflowCase) {
  if (item.caseType === "CUSTOMER_REGISTRATION" && item.primaryObjectId) {
    return `/customers/registrations?customerId=${encodeURIComponent(item.primaryObjectId)}&caseId=${encodeURIComponent(item.id)}&caseCode=${encodeURIComponent(item.caseCode)}&processInstanceKey=${encodeURIComponent(String(item.processInstanceKey ?? ""))}`
  }
  return ""
}

function navigateToOperate(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
