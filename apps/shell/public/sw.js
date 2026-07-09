/* Arda shell service worker — Web Push + open href on click */
self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let data = { title: "Arda", body: "", href: "/", tag: "arda" }
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {
    try {
      data.body = event.data ? event.data.text() : ""
    } catch {
      /* ignore */
    }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Arda", {
      body: data.body || "",
      tag: data.tag || "arda",
      data: { href: data.href || "/" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const href = (event.notification.data && event.notification.data.href) || "/"
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus()
          if ("navigate" in client) {
            return client.navigate(href)
          }
          return undefined
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(href)
      }
      return undefined
    })
  )
})
