import type { UserRole } from "./auth-storage";

export function isAdmin(role: UserRole | undefined) {
  return role === "ADMIN";
}
