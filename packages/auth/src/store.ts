import type { PersistStorage } from "zustand/middleware"
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
  orgIds?: string[]
  activeOrgId?: string
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
    avatarFileId && resolvePicture ? resolvePicture(avatarFileId) : source.picture || ""
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
    orgIds: source.orgIds || [],
    activeOrgId: source.activeOrgId || "",
  }
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (user: AuthUser) => void
  updateUser: (patch: Partial<AuthUser>) => void
  setActiveOrgId: (orgId: string) => void
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
      logout: async () => {
        if (typeof window !== "undefined") {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {})
        }
        set({ user: null, isAuthenticated: false })
      },
    }),
    {
      name: "auth-storage",
      version: 3,
      migrate: (persistedState) => {
        const rawUser =
          persistedState && typeof persistedState === "object" && "user" in persistedState
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
