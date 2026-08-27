export type FileCategory =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "code"
  | "csv"
  | "excel"
  | "word"
  | "text"
  | "unknown"

export type CodeLanguage =
  | "json"
  | "yaml"
  | "xml"
  | "sql"
  | "markdown"
  | "javascript"
  | "typescript"
  | "shell"
  | "css"
  | "html"
  | "plaintext"

export interface FilePreviewSource {
  /** Public or API URL of the file (will be fetched with credentials: "include") */
  src?: string
  /** Direct string or ArrayBuffer content if already loaded in memory */
  content?: string | ArrayBuffer
  /** Original or display filename */
  filename: string
  /** MIME type if known */
  mimeType?: string
  /** Size in bytes if known */
  sizeBytes?: number
  /** Optional custom title for header */
  title?: string
  /** Optional custom download handler */
  onDownload?: () => void
}

/**
 * Detects the file category based on filename extension and MIME type.
 */
export function detectFileCategory(filename: string, mimeType?: string): FileCategory {
  const ext = getFileExtension(filename)
  const mime = (mimeType || "").toLowerCase()

  if (ext === "pdf" || mime.includes("application/pdf")) {
    return "pdf"
  }

  if (
    ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "tiff"].includes(ext) ||
    mime.startsWith("image/")
  ) {
    return "image"
  }

  if (["mp4", "webm", "ogg", "mov", "mkv"].includes(ext) || mime.startsWith("video/")) {
    return "video"
  }

  if (["mp3", "wav", "aac", "m4a", "flac"].includes(ext) || mime.startsWith("audio/")) {
    return "audio"
  }

  if (["csv", "tsv"].includes(ext) || mime.includes("text/csv")) {
    return "csv"
  }

  if (["xlsx", "xls"].includes(ext) || mime.includes("spreadsheet") || mime.includes("excel")) {
    return "excel"
  }

  if (["docx", "doc"].includes(ext) || mime.includes("wordprocessingml") || mime.includes("msword")) {
    return "word"
  }

  if (
    [
      "json",
      "yaml",
      "yml",
      "xml",
      "sql",
      "md",
      "markdown",
      "js",
      "ts",
      "tsx",
      "jsx",
      "sh",
      "bash",
      "zsh",
      "css",
      "scss",
      "html",
      "htm",
      "env",
      "log",
      "graphql",
      "proto",
    ].includes(ext) ||
    mime.includes("application/json") ||
    mime.includes("application/xml") ||
    mime.includes("text/yaml") ||
    mime.includes("text/x-sql")
  ) {
    return "code"
  }

  if (["txt", "conf", "ini", "properties"].includes(ext) || mime.startsWith("text/")) {
    return "text"
  }

  return "unknown"
}

/**
 * Detects code syntax language for code viewer.
 */
export function detectCodeLanguage(filename: string): CodeLanguage {
  const ext = getFileExtension(filename)
  switch (ext) {
    case "json":
      return "json"
    case "yaml":
    case "yml":
      return "yaml"
    case "xml":
    case "svg":
    case "html":
    case "htm":
      return "xml"
    case "sql":
      return "sql"
    case "md":
    case "markdown":
      return "markdown"
    case "js":
    case "jsx":
      return "javascript"
    case "ts":
    case "tsx":
      return "typescript"
    case "sh":
    case "bash":
    case "zsh":
      return "shell"
    case "css":
    case "scss":
      return "css"
    default:
      return "plaintext"
  }
}

export function getFileExtension(filename: string): string {
  const parts = filename.split(".")
  if (parts.length < 2) return ""
  return parts[parts.length - 1].toLowerCase().trim()
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}
