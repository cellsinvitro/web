export type UserRole = "USER" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt?: string;
};

export type AuthResponse = {
  user: AuthUser;
  expiresIn: number;
};
