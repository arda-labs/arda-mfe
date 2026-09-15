/**
 * Workflow domain API — split from the former features/workflow/api.ts.
 *
 * Consumers keep importing `../api`; each resource module owns its client
 * object (casesApi, caseConfigApi, processRolesApi, definitionsApi) or the
 * composed monitoringApi (instances/incidents/jobs/tasks).
 */
import { monitoringIncidentsApi } from "./monitoring/incidents"
import { monitoringInstancesApi } from "./monitoring/instances"
import { monitoringJobsApi } from "./monitoring/jobs"
import { monitoringTasksApi } from "./monitoring/tasks"

export * from "./analytics"
export * from "./cases"
export * from "./configs"
export * from "./definitions"
export * from "./iam-reference"
export * from "./monitoring/incidents"
export * from "./monitoring/instances"
export * from "./monitoring/jobs"
export * from "./monitoring/queries"
export * from "./monitoring/tasks"
export * from "./process-roles"
export * from "./types"

/** Runtime monitoring (Camunda Operate style) — composed facade. */
export const monitoringApi = {
  ...monitoringInstancesApi,
  ...monitoringIncidentsApi,
  ...monitoringJobsApi,
  ...monitoringTasksApi,
}
