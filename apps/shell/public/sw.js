/* Arda shell service worker — Web Push + open href on click */
self.addEventListener("install", (event) => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  let data = { id: "arda", href: "/" }
  try {
    if (event.data) {
      const payload = event.data.json()
      data = {
        id: typeof payload.id === "string" ? payload.id : "arda",
        href: typeof payload.href === "string" ? payload.href : "/",
      }
    }
  } catch {
    /* A malformed payload must not turn into user-visible notification text. */
  }
  let href = "/"
  try {
    const target = new URL(data.href, self.location.origin)
    if (target.origin === self.location.origin) {
      href = `${target.pathname}${target.search}${target.hash}`
    }
  } catch {
    /* Keep the safe default. */
  }
  event.waitUntil(
    self.registration.showNotification("Arda", {
      body: "",
      tag: data.id || "arda",
      data: { href },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const href = (event.notification.data && event.notification.data.href) || "/"
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
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
