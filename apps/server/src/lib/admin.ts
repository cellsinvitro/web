import type { UserRole } from "../generated/prisma/client.js";

export function isAdminUser(user: { role: UserRole }) {
  return user.role === "ADMIN";
}
