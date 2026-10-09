export function shouldPersistRegisterDraft(hasDraftId: boolean, dirty: boolean) {
  return dirty || !hasDraftId
}

export function shouldWarnRegisterExit(dirty: boolean) {
  return dirty
}
