interface Env {
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)

    // On a Workers Route, fetching the incoming request continues to the
    // existing DNS origin, which is the Cloudflare Tunnel into k3s.
    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return fetch(request)
    }

    return env.ASSETS.fetch(request)
  },
}
