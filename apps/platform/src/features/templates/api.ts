import {
  deleteCanonical,
  getCanonical,
  postCanonical,
  putCanonical,
} from "@workspace/api"
import type { FileTemplate } from "./types"

export const templatesApi = {
  listFileTemplates: () => {
    return getCanonical<FileTemplate[]>("/api/platform/templates")
  },
  getFileTemplate: (id: string) => {
    return getCanonical<FileTemplate>(`/api/platform/templates/${id}`)
  },
  createFileTemplate: (data: Partial<FileTemplate>) => {
    return postCanonical<FileTemplate>("/api/platform/templates", data)
  },
  updateFileTemplate: (id: string, data: Partial<FileTemplate>) => {
    return putCanonical<FileTemplate>(`/api/platform/templates/${id}`, data)
  },
  deleteFileTemplate: (id: string) => {
    return deleteCanonical<{ ok: boolean }>(`/api/platform/templates/${id}`)
  },
}
