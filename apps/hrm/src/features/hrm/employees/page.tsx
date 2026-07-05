import { useMemo } from "react"
import { Badge } from "@workspace/ui/components/badge"
import { TableCell, TableRow } from "@workspace/ui/components/table"
import {
  useEmployees,
  useJobTitles,
  useOrgUnits,
  usePositions,
} from "../queries"
import { DataTable, StatusBadge } from "../shared/ui"

export function EmployeesPage() {
  const employees = useEmployees()
  const orgUnits = useOrgUnits()
  const positions = usePositions()
  const jobTitles = useJobTitles()
  const itemMap = useMemo(
    () => ({
      orgUnits: new Map((orgUnits.data ?? []).map((item) => [item.id, item.name])),
      positions: new Map((positions.data ?? []).map((item) => [item.id, item.name])),
      jobTitles: new Map((jobTitles.data ?? []).map((item) => [item.id, item.name])),
    }),
    [jobTitles.data, orgUnits.data, positions.data]
  )
  const items = employees.data ?? []

  return (
    <section className="space-y-4 p-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Thong tin nhan su</h1>
        <Badge variant="secondary">{items.length}</Badge>
      </div>
      <DataTable columns={["Ma nhan su", "Ho ten", "Phong ban", "Chuc vu", "Chuc danh", "Trang thai"]} empty="Chua co nhan su.">
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-mono text-xs">{item.employee_code}</TableCell>
            <TableCell className="font-medium">{item.full_name}</TableCell>
            <TableCell>{item.org_unit_id ? itemMap.orgUnits.get(item.org_unit_id) ?? item.org_unit_id : "-"}</TableCell>
            <TableCell>{item.position_id ? itemMap.positions.get(item.position_id) ?? item.position_id : "-"}</TableCell>
            <TableCell>{item.job_title_id ? itemMap.jobTitles.get(item.job_title_id) ?? item.job_title_id : "-"}</TableCell>
            <TableCell><StatusBadge status={item.status} /></TableCell>
            <TableCell />
          </TableRow>
        ))}
      </DataTable>
    </section>
  )
}
