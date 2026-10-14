// Only a boolean is stored: "I was warned this session that images go to an
// external model". Never any card data.
const KEY = "document-scan.cloud-ack"

export function hasCloudAck(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1"
  } catch {
    return false
  }
}

export function setCloudAck(): void {
  try {
    sessionStorage.setItem(KEY, "1")
  } catch {
    // Private mode / blocked storage: the user is simply asked again.
  }
}
