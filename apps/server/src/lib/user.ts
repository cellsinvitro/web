import type { User, Designation } from "../generated/prisma/client.js";

export function toPublicUser(user: Pick<
  User,
  "id" | "email" | "name" | "avatarUrl" | "designation" | "role" | "createdAt"
>) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    designation: user.designation,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  designation: true,
  role: true,
  createdAt: true,
} as const;

export const DESIGNATION_VALUES: Designation[] = [
  "PHD",
  "MD",
  "MSC",
  "BSC",
  "BTECH",
  "MTECH",
  "POSTDOC",
  "PROFESSOR",
  "RESEARCH_SCIENTIST",
  "GRADUATE_STUDENT",
  "UNDERGRADUATE",
  "OTHER",
];

export function isValidDesignation(value: string): value is Designation {
  return (DESIGNATION_VALUES as string[]).includes(value);
}
