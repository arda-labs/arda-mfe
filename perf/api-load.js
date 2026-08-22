import http from "k6/http"
import { check, sleep } from "k6"
import { Counter, Rate, Trend } from "k6/metrics"

const baseUrl = (__ENV.BASE_URL || "http://localhost:5000").replace(/\/$/, "")
const apiPath = __ENV.API_PATH || "/api/platform/public/branding"
const authCookie = __ENV.AUTH_COOKIE
const authToken = __ENV.AUTH_TOKEN

const apiErrors = new Counter("api_errors")
const apiErrorRate = new Rate("api_error_rate")
const apiDuration = new Trend("api_duration", true)

const targetRps = Number(__ENV.TARGET_RPS || __ENV.RPS || 0)

const thresholds = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<1000", "p(99)<2000"],
  api_error_rate: ["rate<0.01"],
}

export const options = targetRps > 0
  ? {
      scenarios: {
        api_rps: {
          executor: "constant-arrival-rate",
          rate: targetRps,
          timeUnit: "1s",
          duration: __ENV.DURATION || "2m",
          preAllocatedVUs: Number(__ENV.PREALLOCATED_VUS || 300),
          maxVUs: Number(__ENV.MAX_VUS || 2500),
        },
      },
      thresholds,
    }
  : {
      stages: [
        { duration: __ENV.WARMUP || "30s", target: Number(__ENV.WARMUP_VUS || 5) },
        { duration: __ENV.LOAD || "1m", target: Number(__ENV.TARGET_VUS || 25) },
        { duration: __ENV.COOLDOWN || "30s", target: 0 },
      ],
      thresholds,
    }

function headers() {
  const result = {
    Accept: "application/json",
    "Accept-Language": __ENV.LOCALE || "vi",
  }

  if (authCookie) result.Cookie = authCookie
  if (authToken) result.Authorization = `Bearer ${authToken}`

  return result
}

export default function () {
  const response = http.get(`${baseUrl}${apiPath}`, {
    headers: headers(),
    tags: { endpoint: apiPath },
  })

  apiDuration.add(response.timings.duration)

  const ok = check(response, {
    "status is 2xx": (res) => res.status >= 200 && res.status < 300,
  })

  apiErrorRate.add(!ok)
  if (!ok) apiErrors.add(1)

  if (__ENV.THINK_TIME) sleep(Number(__ENV.THINK_TIME))
}

export function handleSummary(data) {
  const metrics = data.metrics
  const duration = metrics.http_req_duration?.values || {}
  const failed = metrics.http_req_failed?.values?.rate ?? 0

  return {
    stdout: `\nAPI load summary\n` +
      `  endpoint: ${baseUrl}${apiPath}\n` +
      `  requests: ${metrics.http_reqs?.values?.count ?? 0}\n` +
      `  p95: ${duration["p(95)"]?.toFixed(0) ?? "n/a"} ms\n` +
      `  p99: ${duration["p(99)"]?.toFixed(0) ?? "n/a"} ms\n` +
      `  failed: ${(failed * 100).toFixed(2)}%\n`,
  }
}
