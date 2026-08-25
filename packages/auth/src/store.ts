import type { PersistStorage } from "zustand/middleware"
import { api, configureApiContext, type ApiSuccess } from "@workspace/api"
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
  activeTenantId?: string
  tenantMemberships?: TenantMembership[]
  tenantSelectionRequired?: boolean
  orgIds?: string[]
  activeOrgId?: string
  roles?: string[]
  permissions?: string[]
  globalRoles?: string[]
  globalPermissions?: string[]
  isGlobalAdmin?: boolean
  globalCapabilitiesLoaded?: boolean
  authVersion?: number
}

export interface TenantMembership {
  tenantId: string
  tenantCode: string
  tenantName: string
  tenantStatus: string
  status: string
  isDefault: boolean
}

export type AuthUserSource = Partial<AuthUser> & {
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
    activeTenantId: source.activeTenantId || source.tenantId || "",
    tenantMemberships: Array.isArray(source.tenantMemberships)
      ? source.tenantMemberships
      : [],
    tenantSelectionRequired: Boolean(source.tenantSelectionRequired),
    orgIds: source.orgIds || [],
    activeOrgId: source.activeOrgId || "",
    roles: Array.isArray(source.roles) ? source.roles : [],
    permissions: Array.isArray(source.permissions) ? source.permissions : [],
    globalRoles: Array.isArray(source.globalRoles) ? source.globalRoles : [],
    globalPermissions: Array.isArray(source.globalPermissions)
      ? source.globalPermissions
      : [],
    isGlobalAdmin: Boolean(source.isGlobalAdmin),
    globalCapabilitiesLoaded: Boolean(source.globalCapabilitiesLoaded),
    authVersion: source.authVersion || 0,
  }
}

export function hasPermission(
  user: AuthUser | null | undefined,
  code: string
): boolean {
  if (!user) return false
  if (user.isGlobalAdmin) return true
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
  return codes.some((code) => hasPermission(user, code))
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (user: AuthUser) => void
  updateUser: (patch: Partial<AuthUser>) => void
  switchTenant: (tenantId: string) => Promise<void>
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
      switchTenant: async (tenantId) => {
        const response = await api.post<ApiSuccess<AuthUserSource>>(
          "/api/auth/tenant/switch",
          { tenant_id: tenantId }
        )
        set({
          user: normalizeAuthUser(response.result),
          isAuthenticated: true,
        })
      },
      setActiveOrgId: (orgId) =>
        set((state) => ({
          user: state.user ? { ...state.user, activeOrgId: orgId } : null,
        })),
      clearSession: () => set({ user: null, isAuthenticated: false }),
      logout: async () => {
        if (typeof window !== "undefined") {
          await api.post("/api/auth/logout").catch(() => {})
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

// Keep the selected organization explicit on every API request. The gateway
// validates membership; the browser never supplies tenant or actor identity.
configureApiContext({
  getActiveOrgId: () => useAuthStore.getState().user?.activeOrgId,
})
