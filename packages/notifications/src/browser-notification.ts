import type { NotificationItem } from "./types"

const PREFERENCE_KEY = "arda.browser-notifications"

export type BrowserNotificationPermission =
  NotificationPermission | "unsupported"

export function browserNotificationsSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof Notification !== "undefined" &&
    window.isSecureContext
  )
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!browserNotificationsSupported()) return "unsupported"
  return Notification.permission
}

/** User opted in via UI (separate from Chrome permission). */
export function isBrowserNotificationPreferred(): boolean {
  if (typeof localStorage === "undefined") return false
  return localStorage.getItem(PREFERENCE_KEY) === "granted"
}

export function setBrowserNotificationPreferred(enabled: boolean) {
  if (typeof localStorage === "undefined") return
  if (enabled) localStorage.setItem(PREFERENCE_KEY, "granted")
  else localStorage.removeItem(PREFERENCE_KEY)
}

/**
 * Must run from a user gesture (button click). Returns final permission.
 */
export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!browserNotificationsSupported()) return "unsupported"
  if (Notification.permission === "granted") {
    setBrowserNotificationPreferred(true)
    return "granted"
  }
  if (Notification.permission === "denied") return "denied"
  const result = await Notification.requestPermission()
  if (result === "granted") setBrowserNotificationPreferred(true)
  return result
}

export function showBrowserNotification(
  title: string,
  options: {
    body?: string
    href?: string
    tag?: string
  } = {}
): boolean {
  if (!browserNotificationsSupported()) return false
  if (Notification.permission !== "granted") return false
  if (!isBrowserNotificationPreferred()) return false

  try {
    const n = new Notification(title || "Arda", {
      body: options.body,
      tag: options.tag,
      // Keep quiet when user is already looking at the tab.
      silent: document.visibilityState === "visible",
    })
    n.onclick = () => {
      window.focus()
      if (options.href) {
        window.location.assign(options.href)
      }
      n.close()
    }
    return true
  } catch {
    return false
  }
}

export function maybeShowBrowserNotification(
  notification: NotificationItem,
  title: string,
  body: string
) {
  if (notification.readAt) return
  // OS banner mainly when tab is in background (Chrome toast outside the page).
  if (document.visibilityState === "visible") return
  showBrowserNotification(title || "Thông báo", {
    body: body || undefined,
    href: notification.href,
    tag: notification.id,
  })
}
