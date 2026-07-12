import { useCallback, useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import type {
  ProcessRole,
  WorkflowAssignmentRule,
  WorkflowCaseType,
  WorkflowDelegation,
  WorkflowRoleCatalog,
  WorkflowRoleMembership,
} from "../api"
import { workflowApi } from "../api"
import {
  AssignmentRuleDialog,
  AssignmentRuleTable,
  caseTypeOptionsFromCaseTypes,
  DelegationDialog,
  DelegationTable,
  LoadingBlock,
  ProcessRoleDialog,
  ProcessRoleTable,
  RoleCatalogDialog,
  RoleCatalogTable,
  RoleMembershipDialog,
  RoleMembershipTable,
  uniqueOptions,
  WorkflowFrame,
} from "../shared/admin-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"

export function ProcessRolesPage() {
  const [stepRoles, setStepRoles] = useState<ProcessRole[]>([])
  const [roleCatalog, setRoleCatalog] = useState<WorkflowRoleCatalog[]>([])
  const [memberships, setMemberships] = useState<WorkflowRoleMembership[]>([])
  const [assignmentRules, setAssignmentRules] = useState<WorkflowAssignmentRule[]>([])
  const [delegations, setDelegations] = useState<WorkflowDelegation[]>([])
  const [caseTypes, setCaseTypes] = useState<WorkflowCaseType[]>([])
  const [source, setSource] = useState<"api" | "mock">("mock")
  const [loading, setLoading] = useState(true)
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sr, rc, mm, ar, dl, ct] = await Promise.all([
        workflowApi.listProcessRoles(),
        workflowApi.listRoleCatalog(),
        workflowApi.listRoleMemberships(),
        workflowApi.listAssignmentRules(),
        workflowApi.listDelegations(),
        workflowApi.listCaseTypes(),
      ])
      setStepRoles(sr.data)
      setRoleCatalog(rc.data)
      setMemberships(mm.data)
      setAssignmentRules(ar.data)
      setDelegations(dl.data)
      setCaseTypes(ct.data)
      setSource(sr.source ?? rc.source)
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const caseTypeOptions = caseTypeOptionsFromCaseTypes(caseTypes)
  const roleCodeOptions = roleCatalog.map((item) => ({ value: item.roleCode, label: `${item.roleCode} - ${item.roleName}` }))
  const iamRoleOptions = uniqueOptions(stepRoles.map((item) => item.iamRole), roleCodeOptions)
  const [activeTab, setActiveTab] = useState("catalog")
  const [editing, setEditing] = useState<ProcessRole | null>(null)
  const [editingCatalog, setEditingCatalog] = useState<WorkflowRoleCatalog | null>(null)
  const [editingMembership, setEditingMembership] = useState<WorkflowRoleMembership | null>(null)
  const [editingRule, setEditingRule] = useState<WorkflowAssignmentRule | null>(null)
  const [editingDelegation, setEditingDelegation] = useState<WorkflowDelegation | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  function onSaved() { void load() }
  const actionLabel = {
    catalog: "Tạo role",
    membership: "Thêm thành viên",
    assignment: "Tạo luật phân công",
    delegation: "Tạo ủy quyền",
    mapping: "Tạo mapping bước",
  }[activeTab] ?? "Tạo"

  return (
    <WorkflowFrame
      title="Vai trò quy trình"
      description="Quản lý role vận hành, thành viên, luật phân công, ủy quyền và mapping từng bước quy trình."
      source={source}
      metrics={[
        { label: "Role", value: String(roleCatalog.length), tone: "default" },
        { label: "Thành viên", value: String(memberships.length), tone: "success" },
        {
          label: "Luật tách maker/checker",
          value: String(assignmentRules.filter((item) => item.requireSeparationOfDuties).length),
          tone: "warning",
        },
      ]}
      action={<Button type="button" size="sm" onClick={() => setCreateOpen(true)}>{actionLabel}</Button>}
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="catalog">Role catalog</TabsTrigger>
            <TabsTrigger value="membership">Thành viên</TabsTrigger>
            <TabsTrigger value="assignment">Luật phân công</TabsTrigger>
            <TabsTrigger value="delegation">Ủy quyền</TabsTrigger>
            <TabsTrigger value="mapping">Mapping bước</TabsTrigger>
          </TabsList>
          <TabsContent value="catalog">
            <RoleCatalogTable items={roleCatalog} onEdit={setEditingCatalog} />
          </TabsContent>
          <TabsContent value="membership">
            <RoleMembershipTable items={memberships} onEdit={setEditingMembership} />
          </TabsContent>
          <TabsContent value="assignment">
            <AssignmentRuleTable items={assignmentRules} onEdit={setEditingRule} />
          </TabsContent>
          <TabsContent value="delegation">
            <DelegationTable items={delegations} onEdit={setEditingDelegation} />
          </TabsContent>
          <TabsContent value="mapping">
            <ProcessRoleTable items={stepRoles} onEdit={setEditing} />
          </TabsContent>
        </Tabs>
      )}
      {createOpen && activeTab === "catalog" ? (
        <RoleCatalogDialog open onOpenChange={setCreateOpen} onSaved={onSaved} />
      ) : null}
      {createOpen && activeTab === "membership" ? (
        <RoleMembershipDialog open roleOptions={roleCodeOptions} onOpenChange={setCreateOpen} onSaved={onSaved} />
      ) : null}
      {createOpen && activeTab === "assignment" ? (
        <AssignmentRuleDialog open caseTypeOptions={caseTypeOptions} roleOptions={roleCodeOptions} onOpenChange={setCreateOpen} onSaved={onSaved} />
      ) : null}
      {createOpen && activeTab === "delegation" ? (
        <DelegationDialog open roleOptions={roleCodeOptions} onOpenChange={setCreateOpen} onSaved={onSaved} />
      ) : null}
      {createOpen && activeTab === "mapping" ? (
        <ProcessRoleDialog open caseTypeOptions={caseTypeOptions} iamRoleOptions={iamRoleOptions} onOpenChange={setCreateOpen} onSaved={onSaved} />
      ) : null}
      {editingCatalog ? (
        <RoleCatalogDialog item={editingCatalog} open onOpenChange={(open) => !open && setEditingCatalog(null)} onSaved={onSaved} />
      ) : null}
      {editingMembership ? (
        <RoleMembershipDialog item={editingMembership} open roleOptions={roleCodeOptions} onOpenChange={(open) => !open && setEditingMembership(null)} onSaved={onSaved} />
      ) : null}
      {editingRule ? (
        <AssignmentRuleDialog item={editingRule} open caseTypeOptions={caseTypeOptions} roleOptions={roleCodeOptions} onOpenChange={(open) => !open && setEditingRule(null)} onSaved={onSaved} />
      ) : null}
      {editingDelegation ? (
        <DelegationDialog item={editingDelegation} open roleOptions={roleCodeOptions} onOpenChange={(open) => !open && setEditingDelegation(null)} onSaved={onSaved} />
      ) : null}
      {editing ? (
        <ProcessRoleDialog
          item={editing}
          open
          caseTypeOptions={caseTypeOptions}
          iamRoleOptions={iamRoleOptions}
          onOpenChange={(open) => !open && setEditing(null)}
          onSaved={onSaved}
        />
      ) : null}
    </WorkflowFrame>
  )
}