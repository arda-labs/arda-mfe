const statusLabelKeys: Record<string, string> = {
  DRAFT: "crm.customers.registrations.status.draft",
  NEEDS_CHANGES: "crm.customers.registrations.status.needs_changes",
  SUBMITTED: "crm.customers.registrations.status.awaiting_approval",
  ACTIVE: "crm.customers.registrations.status.active",
  REJECTED: "crm.customers.registrations.status.rejected",
}

export function registrationStatusLabelKey(status: string) {
  return statusLabelKeys[status]
}
