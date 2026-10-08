import { beforeEach, describe, expect, it } from "bun:test"
import { useNotificationsStore } from "../src/store"

describe("notification store resolution state", () => {
  beforeEach(() => useNotificationsStore.getState().reset())

  it("does not count resolved or superseded items as unread", () => {
    const store = useNotificationsStore.getState()
    store.setUnreadCount(2)
    store.addNotification({
      id: "resolved",
      type: "info",
      createdAt: "2026-10-09T00:00:00Z",
      resolvedAt: "2026-10-09T00:01:00Z",
    })
    store.addNotification({
      id: "superseded",
      type: "info",
      createdAt: "2026-10-09T00:00:00Z",
      supersededAt: "2026-10-09T00:01:00Z",
    })
    expect(useNotificationsStore.getState().unreadCount).toBe(2)
  })

  it("increments unread count only for a new active inbox item", () => {
    const store = useNotificationsStore.getState()
    store.addNotification({
      id: "active",
      type: "warning",
      createdAt: "2026-10-09T00:00:00Z",
    })
    expect(useNotificationsStore.getState().unreadCount).toBe(1)
    useNotificationsStore.getState().addNotification({
      id: "active",
      type: "warning",
      createdAt: "2026-10-09T00:00:00Z",
    })
    expect(useNotificationsStore.getState().unreadCount).toBe(1)
  })
})
