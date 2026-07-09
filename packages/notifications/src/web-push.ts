import { notificationsApi } from "./api"
import {
  browserNotificationsSupported,
  isBrowserNotificationPreferred,
  requestBrowserNotificationPermission,
  setBrowserNotificationPreferred,
} from "./browser-notification"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

export function webPushSupported(): boolean {
  return (
    browserNotificationsSupported() &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  )
}

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!webPushSupported()) return null
  return navigator.serviceWorker.register("/sw.js")
}

export async function enableWebPush(): Promise<"granted" | "denied" | "unsupported" | "unavailable"> {
  if (!webPushSupported()) return "unsupported"
  const permission = await requestBrowserNotificationPermission()
  if (permission !== "granted") {
    return permission === "denied" ? "denied" : "unsupported"
  }

  const registration = await ensureServiceWorker()
  if (!registration) return "unsupported"

  let publicKey: string
  try {
    const res = await notificationsApi.pushPublicKey()
    publicKey = res.publicKey
  } catch {
    return "unavailable"
  }
  if (!publicKey) return "unavailable"

  const existing = await registration.pushManager.getSubscription()
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return "unavailable"
  }

  await notificationsApi.subscribePush({
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  })
  setBrowserNotificationPreferred(true)
  return "granted"
}

export async function disableWebPush(): Promise<void> {
  setBrowserNotificationPreferred(false)
  if (!webPushSupported()) return
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  try {
    await notificationsApi.unsubscribePush(endpoint)
  } catch {
    /* ignore */
  }
  await subscription.unsubscribe()
}

export function isWebPushPreferred(): boolean {
  return isBrowserNotificationPreferred()
}
