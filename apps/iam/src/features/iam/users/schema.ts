import { z } from "zod"
import type { User } from "@/features/iam"

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .max(64, "Username is too long"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().trim().max(100, "First name is too long").optional(),
  lastName: z.string().trim().max(100, "Last name is too long").optional(),
  nickname: z.string().trim().max(100, "Nickname is too long").optional(),
  gender: z.string().trim().max(32, "Gender is too long").optional(),
  country: z.string().trim().max(64, "Country is too long").optional(),
  address: z.string().trim().max(255, "Address is too long").optional(),
  position: z.string().trim().max(128, "Position is too long").optional(),
  tenantId: z.string().trim().min(1, "Tenant is required"),
})

export type CreateUserValues = z.infer<typeof createUserSchema>

export const editUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required")
    .max(64, "Username is too long"),
  email: z.string().trim().email("Enter a valid email"),
  firstName: z.string().trim().max(100, "First name is too long").optional(),
  lastName: z.string().trim().max(100, "Last name is too long").optional(),
  nickname: z.string().trim().max(100, "Nickname is too long").optional(),
  gender: z.string().trim().max(32, "Gender is too long").optional(),
  country: z.string().trim().max(64, "Country is too long").optional(),
  address: z.string().trim().max(255, "Address is too long").optional(),
  position: z.string().trim().max(128, "Position is too long").optional(),
  status: z.enum(["ACTIVE", "DISABLED"]),
  tenantId: z.string().trim().min(1, "Tenant is required"),
})

export type EditUserValues = z.infer<typeof editUserSchema>

export const createUserDefaultValues: CreateUserValues = {
  username: "",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  nickname: "",
  gender: "",
  country: "",
  address: "",
  position: "",
  tenantId: "default",
}

export const editUserDefaultValues: EditUserValues = {
  username: "",
  email: "",
  firstName: "",
  lastName: "",
  nickname: "",
  gender: "",
  country: "",
  address: "",
  position: "",
  status: "ACTIVE",
  tenantId: "default",
}

export function toEditUserValues(user: User): EditUserValues {
  return {
    username: user.username || "",
    email: user.email || "",
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    nickname: user.nickname || "",
    gender: user.gender || "",
    country: user.country || "",
    address: user.address || "",
    position: user.position || "",
    status: user.status === "DISABLED" ? "DISABLED" : "ACTIVE",
    tenantId: user.tenantId || "default",
  }
}
