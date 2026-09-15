import { expect, test } from "bun:test"
import { createAppLocaleLoader } from "../../packages/i18n/src/app-locales"
import { retryFailedLazyLoads } from "../../packages/ui/src/lib/lazy"

test("locale loader loads only the requested language and recovers a failed chunk", async () => {
  let vi = 0
  let en = 0
  const locales = createAppLocaleLoader("audit-test", {
    "vi-VN": async () => { vi++; if (vi === 1) throw new Error("offline"); return { default: { title: "Tiêu đề" } } },
    "en-US": async () => { en++; return { default: { title: "Title" } } },
  })
  await expect(locales.preload("vi-VN")).rejects.toThrow("offline")
  expect(() => locales.read("vi-VN")).toThrow("offline")
  retryFailedLazyLoads()
  await locales.preload("vi-VN")
  expect(() => locales.read("vi-VN")).not.toThrow()
  expect(vi).toBe(2)
  expect(en).toBe(0)
  await Promise.all([locales.preload("en-US"), locales.preload("en-US")])
  expect(en).toBe(1)
})
