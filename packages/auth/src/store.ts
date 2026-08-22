import type { PersistStorage } from "zustand/middleware"
import { apiUrl } from "@workspace/core/http/api-url"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export interface AuthUser {
  userId?: string
  username?: string
  sub: string
  name: string
  displayName?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  birthdate?: string
  gender?: string
  address?: string
  country?: string
  email: string
  picture?: string
  avatarFileId?: string
  coverImage?: string
  coverFileId?: string
  nickname?: string
  department?: string
  position?: string
  employeeId?: string
  approvalLevel?: string
  dailyLimit?: string
  bio?: string
  tenantId?: string
  orgIds?: string[]
  activeOrgId?: string
  roles?: string[]
  permissions?: string[]
  authVersion?: number
}

type AuthUserSource = Partial<AuthUser> & {
  subject?: string
}

type PictureResolver = (avatarFileId: string) => string

function composeDisplayName(source: AuthUserSource): string {
  const fullName = [source.firstName, source.lastName]
    .filter(Boolean)
    .join(" ")
    .trim()
  return (
    source.displayName ||
    fullName ||
    source.name ||
    source.username ||
    source.email ||
    ""
  )
}

export function normalizeAuthUser(
  source: AuthUserSource,
  resolvePicture?: PictureResolver
): AuthUser {
  const avatarFileId = source.avatarFileId?.trim() || ""
  const picture =
    avatarFileId && resolvePicture
      ? resolvePicture(avatarFileId)
      : source.picture || ""
  const displayName = composeDisplayName(source)

  return {
    userId: source.userId || "",
    username: source.username || "",
    sub: source.sub || source.subject || source.userId || "",
    name: displayName,
    displayName,
    firstName: source.firstName || "",
    lastName: source.lastName || "",
    phoneNumber: source.phoneNumber || "",
    birthdate: source.birthdate || "",
    gender: source.gender || "",
    address: source.address || "",
    country: source.country || "",
    email: source.email || "",
    picture,
    avatarFileId,
    coverImage: source.coverImage || "",
    coverFileId: source.coverFileId || "",
    nickname: source.nickname || "",
    department: source.department || "",
    position: source.position || "",
    employeeId: source.employeeId || "",
    approvalLevel: source.approvalLevel || "",
    dailyLimit: source.dailyLimit || "",
    bio: source.bio || "",
    tenantId: source.tenantId || "",
    orgIds: source.orgIds || [],
    activeOrgId: source.activeOrgId || "",
    roles: Array.isArray(source.roles) ? source.roles : undefined,
    permissions: Array.isArray(source.permissions)
      ? source.permissions
      : undefined,
    authVersion: source.authVersion || 0,
  }
}

export function hasPermission(
  user: AuthUser | null | undefined,
  code: string
): boolean {
  if (!user) return false
  if (user.roles?.includes("SUPER_ADMIN")) return true
  return Boolean(
    user.permissions?.includes("superadmin") || user.permissions?.includes(code)
  )
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  codes: string[]
): boolean {
  if (codes.length === 0) return true
  if (user && user.roles === undefined && user.permissions === undefined)
    return true
  return codes.some((code) => hasPermission(user, code))
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (user: AuthUser) => void
  updateUser: (patch: Partial<AuthUser>) => void
  setActiveOrgId: (orgId: string) => void
  clearSession: () => void
  logout: () => Promise<void>
}

const noopStorage: PersistStorage<AuthState> = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      updateUser: (patch) =>
        set((state) => {
          if (!state.user) return state
          const mergedUser = { ...state.user, ...patch }
          if (
            patch.displayName === undefined &&
            (patch.name !== undefined ||
              patch.firstName !== undefined ||
              patch.lastName !== undefined ||
              patch.username !== undefined ||
              patch.email !== undefined)
          ) {
            mergedUser.displayName = composeDisplayName(mergedUser)
          }
          return { user: mergedUser }
        }),
      setActiveOrgId: (orgId) =>
        set((state) => ({
          user: state.user ? { ...state.user, activeOrgId: orgId } : null,
        })),
      clearSession: () => set({ user: null, isAuthenticated: false }),
      logout: async () => {
        if (typeof window !== "undefined") {
          await fetch(apiUrl("/api/auth/logout"), {
            method: "POST",
            credentials: "include",
          }).catch(() => {})
        }
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: "auth-storage",
      version: 3,
      migrate: (persistedState) => {
        const rawUser =
          persistedState &&
          typeof persistedState === "object" &&
          "user" in persistedState
            ? persistedState.user
            : null
        if (rawUser) {
          const state = persistedState as AuthState
          return { ...state, user: normalizeAuthUser(rawUser) }
        }
        return persistedState as AuthState
      },
      storage:
        typeof window !== "undefined"
          ? createJSONStorage<AuthState>(() => localStorage)
          : noopStorage,
    }
  )
)
