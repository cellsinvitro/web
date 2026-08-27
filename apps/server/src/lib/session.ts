import type { UserRole, Designation } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";
import {
  getAccessExpiresInSeconds,
  hashToken,
  signAccessToken,
  signRefreshToken,
} from "./jwt.js";

export async function issueTokenPair(user: {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  designation?: Designation | null;
  role: UserRole;
  createdAt?: Date;
}) {
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
  });
  const { token: refreshToken, expiresAt } = await signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId: user.id,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      designation: user.designation ?? null,
      role: user.role,
      createdAt: user.createdAt?.toISOString(),
    },
    accessToken,
    refreshToken,
    expiresIn: getAccessExpiresInSeconds(),
  };
}
