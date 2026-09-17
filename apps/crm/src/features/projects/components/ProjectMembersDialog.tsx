import { useState } from "react"
import { useI18n } from "@workspace/i18n"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Skeleton } from "@workspace/ui/components/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { Trash2 } from "lucide-react"
import type { CrmProject, CrmProjectMember } from "../../api"

/** Members sub-table for one project. `members === null` = still loading. */
export function ProjectMembersDialog({
  project,
  members,
  onAdd,
  onRemove,
  onClose,
}: {
  project: CrmProject
  members: CrmProjectMember[] | null
  onAdd: (userId: string, roleCode: string) => Promise<void>
  onRemove: (memberId: string) => Promise<void>
  onClose: () => void
}) {
  const { t } = useI18n()
  const [userId, setUserId] = useState("")
  const [roleCode, setRoleCode] = useState("")
  const [busy, setBusy] = useState(false)

  const add = async () => {
    const id = userId.trim()
    if (!id) return
    setBusy(true)
    try {
      await onAdd(id, roleCode)
      setUserId("")
      setRoleCode("")
    } finally {
      setBusy(false)
    }
  }

  const remove = async (memberId: string) => {
    setBusy(true)
    try {
      await onRemove(memberId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {t("crm.projects.members")} · {project.project_code}
          </DialogTitle>
          <DialogDescription>{project.name}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="crm_member_user">{t("crm.projects.field.user")}</Label>
            <Input
              id="crm_member_user"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="crm_member_role">{t("crm.projects.field.role")}</Label>
            <Input
              id="crm_member_role"
              value={roleCode}
              onChange={(event) => setRoleCode(event.target.value)}
            />
          </div>
          <Button size="sm" disabled={busy || !userId.trim()} onClick={() => void add()}>
            {t("common.action.create")}
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("crm.projects.field.user")}</TableHead>
                <TableHead>{t("crm.projects.field.role")}</TableHead>
                <TableHead className="text-right">
                  {t("common.field.action")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members === null ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-6">
                    <Skeleton className="mx-auto h-4 w-48" />
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    {t("crm.projects.empty_members")}
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-xs">
                      {member.user_id}
                    </TableCell>
                    <TableCell className="text-xs">
                      {member.role_code || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-1.5 text-destructive hover:text-destructive"
                        title={t("common.action.delete")}
                        aria-label={t("common.action.delete")}
                        disabled={busy}
                        onClick={() => void remove(member.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t("common.action.close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
