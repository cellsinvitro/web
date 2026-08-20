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
    },
    accessToken,
    refreshToken,
    expiresIn: getAccessExpiresInSeconds(),
  };
}
