import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Textarea } from "@workspace/ui/components/textarea"
import { CheckCircle2, Loader2, Send, ThumbsDown, ThumbsUp, XCircle } from "lucide-react"
import { knowledgeApi, type JobOut, type VersionOut } from "../api"

const POLL_INTERVAL = 2000

type VersionActionsProps = {
  version: VersionOut
  sourceId: number
  onMutate: () => Promise<void>
}

export function useJobPoll(jobId: string | null, onDone: () => void) {
  const [job, setJob] = useState<JobOut | null>(null)

  useEffect(() => {
    if (!jobId) {
      setJob(null)
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      try {
        const result = await knowledgeApi.getJob(jobId)
        if (cancelled) return
        setJob(result)
        if (result.status === "COMPLETED" || result.status === "FAILED") {
          onDone()
          return
        }
        timer = setTimeout(poll, POLL_INTERVAL)
      } catch {
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL)
      }
    }
    void poll()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [jobId, onDone])

  return job
}

function IndexingProgress({ job }: { job: JobOut }) {
  const { t } = useI18n()
  const { total_chunks, embedded_chunks } = job

  if (total_chunks > 0) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("ai.knowledge.job_progress", {
          embedded: embedded_chunks,
          total: total_chunks,
        })}
      </span>
    )
  }
  switch (job.status) {
    case "PENDING":
      return (
        <span className="text-xs text-muted-foreground">
          {t("ai.knowledge.job_pending")}
        </span>
      )
    case "RUNNING":
      return (
        <span className="text-xs text-muted-foreground">
          {t("ai.knowledge.job_running")}
        </span>
      )
    default:
      return null
  }
}

export function VersionActionsInner({ version, sourceId, onMutate }: VersionActionsProps) {
  const { t } = useI18n()
  const [publishing, setPublishing] = useState(false)
  const [publishJobId, setPublishJobId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const handleJobDone = useCallback(() => {
    setPublishing(false)
    setPublishJobId(null)
    void onMutate()
  }, [onMutate])

  const pollJob = useJobPoll(publishing ? publishJobId : null, handleJobDone)

  const handleApprove = async () => {
    try {
      await knowledgeApi.reviewVersion(sourceId, version.id, { decision: "approve" })
      notify.success(t("ai.knowledge.toast.approved"))
      void onMutate()
    } catch (err) {
      notify.error(
        t("ai.knowledge.toast.action_failed"),
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  const handleReject = async () => {
    try {
      await knowledgeApi.reviewVersion(sourceId, version.id, {
        decision: "reject",
        reason: rejectReason || null,
      })
      notify.success(t("ai.knowledge.toast.rejected"))
      setRejectDialogOpen(false)
      setRejectReason("")
      void onMutate()
    } catch (err) {
      notify.error(
        t("ai.knowledge.toast.action_failed"),
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const result = await knowledgeApi.publishVersion(sourceId, version.id)
      setPublishJobId(result.job_id)
    } catch (err) {
      setPublishing(false)
      notify.error(
        t("ai.knowledge.toast.action_failed"),
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  if (publishing || publishJobId) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="size-4 animate-spin" />
        <Badge variant="secondary">
          {t("ai.knowledge.indexing")}
        </Badge>
        {pollJob && <IndexingProgress job={pollJob} />}
        {pollJob?.status === "FAILED" && (
          <span className="text-xs text-destructive">
            {t("ai.knowledge.job_failed", {
              error: pollJob.error_message ?? "Unknown",
            })}
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {version.status === "DRAFT" && (
          <>
            <Button size="sm" variant="outline" onClick={handleApprove}>
              <ThumbsUp className="mr-1.5 size-3.5" />
              {t("ai.knowledge.approve")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => setRejectDialogOpen(true)}
            >
              <ThumbsDown className="mr-1.5 size-3.5" />
              {t("ai.knowledge.reject")}
            </Button>
          </>
        )}
        {version.status === "APPROVED" && (
          <Button size="sm" variant="default" onClick={handlePublish}>
            <Send className="mr-1.5 size-3.5" />
            {t("ai.knowledge.publish")}
          </Button>
        )}
        {version.status === "INDEXING" && (
          <Badge variant="secondary">{t("ai.knowledge.indexing")}</Badge>
        )}
        {version.status === "PUBLISHED" && (
          <Badge variant="success">
            <CheckCircle2 className="mr-1 size-3.5" />
            {t("ai.knowledge.published")}
          </Badge>
        )}
        {version.status === "FAILED" && (
          <Badge variant="destructive">
            <XCircle className="mr-1 size-3.5" />
            {t("ai.knowledge.status.failed")}
          </Badge>
        )}
      </div>

      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("ai.knowledge.reject_reason")}</AlertDialogTitle>
          </AlertDialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t("ai.knowledge.placeholder.reject_reason")}
            rows={3}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.action.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("ai.knowledge.reject")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
