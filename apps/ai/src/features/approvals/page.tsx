import { useCallback, useEffect, useState } from "react"
import { useI18n } from "@workspace/i18n"
import { notify } from "@workspace/ui/feedback/notify"
import { Button } from "@workspace/ui/components/button"
import { PageHeader } from "@workspace/ui/components/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { RefreshCw, ShieldCheck } from "lucide-react"
import { approvalsApi } from "./api"
import { AuditTrail } from "./components/audit-trail"
import { ProposalDetailDialog } from "./components/proposal-detail-dialog"
import { ProposalListTab } from "./components/proposal-list-tab"
import type { ApprovalDetail } from "./types"

export function ApprovalsPage() {
  const { t } = useI18n()
  const [proposals, setProposals] = useState<ApprovalDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<ApprovalDetail | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const loadProposals = useCallback(async () => {
    setLoading(true)
    try {
      const data = await approvalsApi.listApprovals()
      setProposals(data)
    } catch {
      notify.error(t("ai.approvals.load_failed"))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadProposals()
  }, [loadProposals])

  const handleDecision = async (id: string, decision: "approve" | "reject") => {
    try {
      await approvalsApi.decideApproval(id, decision)
      notify.success(
        decision === "approve"
          ? t("ai.approvals.toast.approved")
          : t("ai.approvals.toast.rejected")
      )
      loadProposals()
    } catch {
      notify.error(t("ai.approvals.toast.action_failed"))
    }
  }

  const pendingList = proposals.filter((p) => p.status === "PENDING")
  const historyList = proposals.filter((p) => p.status !== "PENDING")

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title={t("ai.approvals.title")}
          description={t("ai.approvals.description")}
          icon={ShieldCheck}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
          onClick={loadProposals}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {t("ai.approvals.btn.refresh")}
        </Button>
      </div>

      <Tabs defaultValue="pending" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="w-fit">
          <TabsTrigger value="pending" className="gap-2">
            {t("ai.approvals.tab.pending")}
            {pendingList.length > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                {pendingList.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            {t("ai.approvals.tab.history")}
          </TabsTrigger>
          <TabsTrigger value="audit">
            {t("ai.approvals.tab.audit")}
          </TabsTrigger>
        </TabsList>

        <div className="mt-4 flex-1">
          <TabsContent value="pending" className="m-0 focus-visible:outline-none">
            <ProposalListTab
              proposals={pendingList}
              loading={loading}
              onSelect={(p) => {
                setSelectedProposal(p)
                setDialogOpen(true)
              }}
              onApprove={(id) => handleDecision(id, "approve")}
              onReject={(id) => handleDecision(id, "reject")}
            />
          </TabsContent>

          <TabsContent value="history" className="m-0 focus-visible:outline-none">
            <ProposalListTab
              proposals={historyList}
              loading={loading}
              isHistory
              onSelect={(p) => {
                setSelectedProposal(p)
                setDialogOpen(true)
              }}
              onApprove={(id) => handleDecision(id, "approve")}
              onReject={(id) => handleDecision(id, "reject")}
            />
          </TabsContent>

          <TabsContent value="audit" className="m-0 focus-visible:outline-none">
            <AuditTrail />
          </TabsContent>
        </div>
      </Tabs>

      <ProposalDetailDialog
        proposal={selectedProposal}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onApprove={(id) => handleDecision(id, "approve")}
        onReject={(id) => handleDecision(id, "reject")}
      />
    </div>
  )
}
