import { api } from "@workspace/api"

export type SourceType = "docs" | "admin" | "url"
export type SourceScope = "tenant" | "global" | "system"

export interface SourceOut {
  id: number
  tenant_id: string | null
  title: string
  description: string | null
  source_type: SourceType
  scope: SourceScope
  classification: string
  language: string | null
  tags: string[]
  owner_id: string | null
  effective_from: string | null
  effective_to: string | null
  active_version_id: number | null
  deleted_at: string | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
  // Computed from active version
  status: string | null
  version: string | null
}

export interface SourceCreate {
  title: string
  description?: string | null
  source_type: SourceType
  scope: SourceScope
  classification?: string
  language?: string
  tags?: string[]
  owner_id?: string | null
  effective_from?: string | null
  effective_to?: string | null
}

export type VersionContentType = "markdown" | "url" | "file"

export interface ChunkerConfig {
  strategy?: string
  chunk_size?: number
  chunk_overlap?: number
  chunker_version?: string
}

export interface VersionCreate {
  version: string
  content_type: VersionContentType
  content?: string | null
  content_url?: string | null
  chunker_config?: ChunkerConfig | null
}

export interface VersionOut {
  id: number
  source_id: number
  version: string
  status: string
  content_type: VersionContentType
  content: string | null
  content_url: string | null
  chunker_version: string | null
  chunk_size: number | null
  chunk_overlap: number | null
  content_hash: string | null
  status_history: Record<string, unknown>[]
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ReviewRequest {
  decision: "approve" | "reject"
  reason?: string | null
}

export interface PublishResult {
  job_id: string
  version_id: number
  status: string
}

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"

export interface JobOut {
  id: string
  source_version_id: number
  status: JobStatus
  locked_by: string | null
  locked_at: string | null
  attempts: number
  max_attempts: number
  error_message: string | null
  total_chunks: number
  embedded_chunks: number
  next_retry_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface QueryHitOut {
  source_id: number
  source_version_id: number
  version: string
  title: string
  heading: string
  content: string
  score: number
  citation: string
}

export interface QueryRequest {
  query: string
  top_k: number
}

export interface QueryResponse {
  run_id: string
  hits: QueryHitOut[]
  latency_ms: number
  rewritten: boolean
  retrieved_count: number
  reranked_count: number
}

export interface FeedbackRequest {
  run_id: string
  helpful: boolean
  comment?: string | null
}

export interface FeedbackOut {
  id: string
  run_id: string
  helpful: boolean
  comment: string | null
  created_at: string | null
}

export interface ChunkPreviewOut {
  index: number
  heading: string
  content: string
  content_hash: string
  word_count: number
  char_count: number
}

export interface ChunkPreviewRequest {
  content: string
  chunker_config?: ChunkerConfig | null
}

export interface ChunkPreviewResponse {
  total_chunks: number
  extracted_text: string | null
  chunks: ChunkPreviewOut[]
}

export const knowledgeApi = {
  listSources: (includeDeleted = false) =>
    api.get<SourceOut[]>(
      `/api/rag/sources?include_deleted=${includeDeleted}`
    ),
  createSource: (data: SourceCreate) =>
    api.post<SourceOut>("/api/rag/sources", data),
  deleteSource: (sourceId: number) =>
    api.delete<void>(`/api/rag/sources/${sourceId}`),
  listVersions: (sourceId: number) =>
    api.get<VersionOut[]>(`/api/rag/sources/${sourceId}/versions`),
  createVersion: (sourceId: number, data: VersionCreate) =>
    api.post<VersionOut>(`/api/rag/sources/${sourceId}/versions`, data),
  reviewVersion: (sourceId: number, versionId: number, data: ReviewRequest) =>
    api.post<VersionOut>(
      `/api/rag/sources/${sourceId}/versions/${versionId}/review`,
      data
    ),
  publishVersion: (sourceId: number, versionId: number) =>
    api.post<PublishResult>(
      `/api/rag/sources/${sourceId}/versions/${versionId}/publish`
    ),
  getJob: (jobId: string) => api.get<JobOut>(`/api/rag/jobs/${jobId}`),
  query: (data: QueryRequest) =>
    api.post<QueryResponse>("/api/rag/query", data),
  feedback: (data: FeedbackRequest) =>
    api.post<FeedbackOut>("/api/rag/feedback", data),
  previewChunks: (data: ChunkPreviewRequest) =>
    api.post<ChunkPreviewResponse>("/api/rag/sources/preview-chunks", data),
  parseAndPreviewFile: (file: File, chunkSize = 512, chunkOverlap = 64) => {
    const formData = new FormData()
    formData.append("file", file)
    formData.append("chunk_size", String(chunkSize))
    formData.append("chunk_overlap", String(chunkOverlap))
    return api.post<ChunkPreviewResponse>("/api/rag/sources/parse-preview", formData)
  },
}
