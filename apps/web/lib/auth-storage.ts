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
};
