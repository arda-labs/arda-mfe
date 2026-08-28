import { apiUrl } from "./url"

export interface DownloadFileOptions {
  filename?: string
  fallbackFilename?: string
}

/**
 * Downloads a file from an API endpoint with credentials (cookies) and auth headers,
 * converting the response stream to a browser download blob.
 */
export async function downloadFile(
  path: string,
  options: DownloadFileOptions = {}
): Promise<void> {
  const url = apiUrl(path)
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  })

  if (!res.ok) {
    let errorMessage = `Download failed with status ${res.status}`
    try {
      const errorJson = await res.json()
      if (errorJson?.message) {
        errorMessage = errorJson.message
      }
    } catch {
      // Not JSON error
    }
    throw new Error(errorMessage)
  }

  // Extract filename from Content-Disposition header if available
  let resolvedFilename = options.filename
  if (!resolvedFilename) {
    const disposition = res.headers.get("Content-Disposition")
    if (disposition && disposition.includes("filename=")) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      if (match && match[1]) {
        resolvedFilename = match[1].replace(/['"]/g, "")
      }
    }
  }

  if (!resolvedFilename) {
    resolvedFilename = options.fallbackFilename || "download"
  }

  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = blobUrl
  link.download = resolvedFilename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(blobUrl)
}
