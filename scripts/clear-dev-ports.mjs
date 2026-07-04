import { execFile } from "node:child_process"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const ports = (process.env.DEV_PORTS ?? "5000,5101,5102,5103,5104,5105,5106,5107")
  .split(",")
  .map((port) => Number(port.trim()))
  .filter(Boolean)

if (!ports.length) process.exit(0)

const pids =
  process.platform === "win32"
    ? await windowsPids(ports)
    : await unixPids(ports)

if (!pids.length) {
  console.log(`dev ports clear: ${ports.join(", ")}`)
  process.exit(0)
}

for (const pid of pids) {
  if (pid === process.pid) continue
  await killPid(pid)
}

console.log(`dev ports cleared: ${ports.join(", ")} (${pids.length} process${pids.length === 1 ? "" : "es"})`)

async function windowsPids(targetPorts) {
  const powershellPids = await windowsPidsFromPowershell(targetPorts)
  if (powershellPids.length) return powershellPids

  const { stdout } = await execFileAsync("netstat", ["-ano", "-p", "tcp"])
  const pids = new Set()
  for (const line of stdout.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/)
    if (parts.length < 5 || parts[0] !== "TCP" || parts[3] !== "LISTENING") continue
    const port = Number(parts[1].split(":").pop())
    const pid = Number(parts[4])
    if (targetPorts.includes(port) && pid > 0) pids.add(pid)
  }
  return [...pids]
}

async function windowsPidsFromPowershell(targetPorts) {
  const portsArg = targetPorts.join(",")
  try {
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      `Get-NetTCPConnection -State Listen -LocalPort ${portsArg} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess`,
    ])
    return [
      ...new Set(
        stdout
          .split(/\s+/)
          .map(Number)
          .filter((pid) => pid > 0),
      ),
    ]
  } catch {
    return []
  }
}

async function unixPids(targetPorts) {
  const pids = new Set()
  for (const port of targetPorts) {
    try {
      const { stdout } = await execFileAsync("lsof", [`-tiTCP:${port}`, "-sTCP:LISTEN"])
      stdout
        .split(/\s+/)
        .map(Number)
        .filter(Boolean)
        .forEach((pid) => pids.add(pid))
    } catch {
      // lsof exits non-zero when nothing is listening.
    }
  }
  return [...pids]
}

async function killPid(pid) {
  if (process.platform === "win32") {
    await execFileAsync("taskkill", ["/PID", String(pid), "/F"])
    return
  }
  try {
    process.kill(pid, "SIGTERM")
  } catch {
    // Process may have exited between scan and kill.
  }
}
