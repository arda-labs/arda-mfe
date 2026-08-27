import { readdir, readFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"
import process from "node:process"

const root = path.resolve(import.meta.dirname, "..")

function getAllKeys(obj, prefix = "") {
  let keys = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys = keys.concat(getAllKeys(value, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys
}

async function checkLocaleDir(dirPath, label) {
  const viFile = path.join(dirPath, "vi-VN.json")
  const enFile = path.join(dirPath, "en-US.json")

  if (!existsSync(viFile) || !existsSync(enFile)) {
    return false
  }

  let hasError = false
  try {
    const viContent = JSON.parse(await readFile(viFile, "utf-8"))
    const enContent = JSON.parse(await readFile(enFile, "utf-8"))

    const viKeys = new Set(getAllKeys(viContent))
    const enKeys = new Set(getAllKeys(enContent))

    const missingInEn = [...viKeys].filter((k) => !enKeys.has(k))
    const missingInVi = [...enKeys].filter((k) => !viKeys.has(k))

    if (missingInEn.length > 0) {
      console.error(`❌ [${label}] Missing in en-US.json (${missingInEn.length} keys):`)
      missingInEn.slice(0, 5).forEach((k) => console.error(`   - ${k}`))
      hasError = true
    }

    if (missingInVi.length > 0) {
      console.error(`❌ [${label}] Missing in vi-VN.json (${missingInVi.length} keys):`)
      missingInVi.slice(0, 5).forEach((k) => console.error(`   - ${k}`))
      hasError = true
    }

    if (!hasError) {
      console.log(`✅ [${label}] Synced (${viKeys.size} keys)`)
    }
  } catch (err) {
    console.error(`❌ Error reading locales in ${dirPath}: ${err.message}`)
    return true
  }

  return hasError
}

async function checkPackagesLocales() {
  const localesDir = path.join(root, "packages", "i18n", "src", "locales")
  const viDir = path.join(localesDir, "vi-VN")
  const enDir = path.join(localesDir, "en-US")

  let hasError = false
  if (!existsSync(viDir) || !existsSync(enDir)) return false

  const viFiles = (await readdir(viDir)).filter((f) => f.endsWith(".json"))

  for (const file of viFiles) {
    const viFile = path.join(viDir, file)
    const enFile = path.join(enDir, file)
    const ns = path.basename(file, ".json")

    try {
      const viContent = JSON.parse(await readFile(viFile, "utf-8"))
      const enContent = JSON.parse(await readFile(enFile, "utf-8"))

      const viKeys = new Set(getAllKeys(viContent))
      const enKeys = new Set(getAllKeys(enContent))

      const missingInEn = [...viKeys].filter((k) => !enKeys.has(k))
      const missingInVi = [...enKeys].filter((k) => !viKeys.has(k))

      if (missingInEn.length > 0) {
        console.error(`❌ [packages/i18n:${ns}] Missing in en-US (${missingInEn.length} keys):`)
        missingInEn.slice(0, 5).forEach((k) => console.error(`   - ${k}`))
        hasError = true
      }
      if (missingInVi.length > 0) {
        console.error(`❌ [packages/i18n:${ns}] Missing in vi-VN (${missingInVi.length} keys):`)
        missingInVi.slice(0, 5).forEach((k) => console.error(`   - ${k}`))
        hasError = true
      }
      if (missingInEn.length === 0 && missingInVi.length === 0) {
        console.log(`✅ [packages/i18n:${ns}] Synced (${viKeys.size} keys)`)
      }
    } catch (err) {
      console.error(`❌ Error checking ${file}: ${err.message}`)
      hasError = true
    }
  }

  return hasError
}

async function checkAppsLocales() {
  const appsDir = path.join(root, "apps")
  const apps = await readdir(appsDir)
  let hasError = false

  for (const app of apps) {
    const appLocalesDir = path.join(appsDir, app, "locales")
    if (existsSync(appLocalesDir)) {
      const appErr = await checkLocaleDir(appLocalesDir, `apps/${app}`)
      if (appErr) hasError = true
    }
  }

  return hasError
}

async function main() {
  console.log("🔍 Checking i18n translation parity across packages and apps...\n")
  let error = false

  const pkgError = await checkPackagesLocales()
  if (pkgError) error = true

  const appError = await checkAppsLocales()
  if (appError) error = true

  if (error) {
    console.error("\n❌ i18n parity check failed! Please synchronize missing translation keys.")
    process.exit(1)
  } else {
    console.log("\n🎉 All translation keys are 100% in sync!")
  }
}

main()
