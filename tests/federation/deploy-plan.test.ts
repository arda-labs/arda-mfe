import { describe, expect, test } from "bun:test"
import { deployedSha, unitTouched } from "../../scripts/plan-cloudflare-deploy.mjs"

describe("cloudflare deploy plan", () => {
  test("an app-only change deploys only that unit", () => {
    const files = ["apps/finance/src/features/accounts/page.tsx"]
    expect(unitTouched("finance", files)).toBe(true)
    expect(unitTouched("hrm", files)).toBe(false)
    expect(unitTouched("shell", files)).toBe(false)
  })

  test("shared packages, build scripts and federation config deploy every unit", () => {
    for (const file of ["packages/ui/src/components/button.tsx", "scripts/build-cloudflare-app.mjs", "bun.lock", "package.json", "federation.shared.ts"]) {
      expect(unitTouched("crm", [file])).toBe(true)
      expect(unitTouched("shell", [file])).toBe(true)
    }
  })

  test("a Worker config or the shell's Worker code deploys only its unit", () => {
    expect(unitTouched("iam", ["cloudflare/wrangler.iam.jsonc"])).toBe(true)
    expect(unitTouched("mdm", ["cloudflare/wrangler.iam.jsonc"])).toBe(false)
    expect(unitTouched("shell", ["cloudflare/shell-csp.ts"])).toBe(true)
    expect(unitTouched("iam", ["cloudflare/shell-csp.ts"])).toBe(false)
  })

  test("docs, tests and CI files deploy nothing", () => {
    const files = ["README.md", "packages/ui/README.md", "tests/federation/release.test.ts", ".github/workflows/verify.yml", "docs/x.md"]
    expect(unitTouched("shell", files)).toBe(false)
    expect(unitTouched("finance", files)).toBe(false)
  })

  test("reads the git sha from a live buildId", () => {
    expect(deployedSha("85dc551-1791891083269")).toBe("85dc551")
    expect(deployedSha("local-1791891083269")).toBeNull()
    expect(deployedSha(null)).toBeNull()
  })
})
