interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    // Legacy fallback. Production has a more-specific no-script Worker route
    // for arda.io.vn/api/* and new frontend builds call api.arda.io.vn.
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return fetch(request)
    }

    return env.ASSETS.fetch(request)
  },
}
