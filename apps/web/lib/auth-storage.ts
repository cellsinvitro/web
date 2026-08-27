export type UserRole = "USER" | "ADMIN";

export type Designation =
  | "PHD"
  | "MD"
  | "MSC"
  | "BSC"
  | "BTECH"
  | "MTECH"
  | "POSTDOC"
  | "PROFESSOR"
  | "RESEARCH_SCIENTIST"
  | "GRADUATE_STUDENT"
  | "UNDERGRADUATE"
  | "OTHER";

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  designation: Designation | null;
  role: UserRole;
  createdAt?: string;
};

export type AuthResponse = {
  user: AuthUser;
  expiresIn: number;
  accessToken?: string;
};

const ACCESS_TOKEN_KEY = "civ_access_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  if (typeof window !== "undefined") window.localStorage.removeItem(ACCESS_TOKEN_KEY);
}
