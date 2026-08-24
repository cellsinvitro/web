import type { User } from "../generated/prisma/client.js";

export function toPublicUser(user: Pick<
  User,
  "id" | "email" | "name" | "avatarUrl" | "role" | "createdAt"
>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  role: true,
  createdAt: true,
} as const;
