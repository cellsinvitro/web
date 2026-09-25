import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  type AuthResponse,
  type AuthUser,
  type Designation,
} from "./auth-storage";
import type {
  AllowedUsersModel,
  LabActivityModel,
  LabModel,
  ReceivedRequest,
  SentRequest,
} from "./cyrosearch/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/api";
const UPLOAD_API_URL =
  process.env.NEXT_PUBLIC_UPLOAD_API_URL?.replace(/\/$/, "") ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://cellsinvitro.onrender.com"
    : API_URL);

type ApiErrorBody = {
  error?: string;
};

async function parseError(response: Response) {
  const data = (await response.json().catch(() => null)) as ApiErrorBody | null;
  return data?.error || "Something went wrong. Please try again.";
}

async function refreshAccessToken() {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({}),
  });

  if (!response.ok) return false;
  const data = (await response.json()) as AuthResponse;
  if (data.accessToken) setAccessToken(data.accessToken);
  return true;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers = new Headers(options.headers);
  const accessToken = getAccessToken();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, options, false);
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response.json() as Promise<T>;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  code: string;
}) {
  const data = await apiFetch<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    false
  );
  if (data.accessToken) setAccessToken(data.accessToken);
  return data;
}

export async function loginUser(input: { email: string; password: string }) {
  const data = await apiFetch<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    false
  );
  if (data.accessToken) setAccessToken(data.accessToken);
  return data;
}

export type ToolKey = "chatbot" | "molarity" | "ic50";

export async function consumeToolUse(toolKey: ToolKey) {
  return apiFetch<{ allowed: true; limit: number | null; used: number }>(
    `/tools/usage/${toolKey}/consume`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export type ToolSetting = { toolKey: ToolKey; usageLimit: number | null; updatedAt: string };

export async function fetchAdminToolSettings() {
  const data = await apiFetch<{ settings: ToolSetting[] }>("/tools/admin");
  return data.settings;
}

export async function updateAdminToolSetting(toolKey: ToolKey, usageLimit: number | null) {
  const data = await apiFetch<{ setting: ToolSetting }>(`/tools/admin/${toolKey}`, {
    method: "PATCH",
    body: JSON.stringify({ usageLimit }),
  });
  return data.setting;
}

export async function sendOtpApi(input: {
  email: string;
  purpose?: "LOGIN" | "REGISTRATION" | "PASSWORD_RESET";
}) {
  return apiFetch<{ success: boolean; message: string }>(
    "/auth/send-otp",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    false
  );
}

export async function verifyOtpApi(input: {
  email: string;
  code: string;
  purpose?: "LOGIN" | "REGISTRATION" | "PASSWORD_RESET";
}) {
  const data = await apiFetch<AuthResponse>(
    "/auth/verify-otp",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    false
  );
  if (data.accessToken) setAccessToken(data.accessToken);
  return data;
}


export async function logoutUser() {
  try {
    await apiFetch(
      "/auth/logout",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
      false
    );
  } catch {
    // Cookie clear still happens server-side when the request succeeds.
  } finally {
    clearAccessToken();
  }
}

export async function fetchCurrentUser() {
  try {
    const data = await apiFetch<{ user: AuthUser }>("/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function updateProfile(input: {
  name?: string;
  designation?: Designation | null;
}) {
  const data = await apiFetch<{ user: AuthUser }>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.user;
}

export type CryoSearchState = {
  labs: LabModel[];
  activities: LabActivityModel[];
  receivedRequests: ReceivedRequest[];
  sentRequests: SentRequest[];
  allowedUsers: AllowedUsersModel[];
};

export type CryoAdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  hasCryoState: boolean;
  labCount: number;
  updatedAt: string | null;
};

export async function fetchCryoSearchState(targetUserId?: string) {
  const query = targetUserId ? `?targetUserId=${encodeURIComponent(targetUserId)}` : "";
  return apiFetch<CryoSearchState>(`/cryosearch/state${query}`);
}

export async function saveCryoSearchState(state: CryoSearchState, targetUserId?: string) {
  const query = targetUserId ? `?targetUserId=${encodeURIComponent(targetUserId)}` : "";
  return apiFetch<CryoSearchState>(`/cryosearch/state${query}`, {
    method: "PUT",
    body: JSON.stringify(state),
  });
}

export async function fetchCryoAdminUsers() {
  return apiFetch<CryoAdminUser[]>("/cryosearch/admin/users");
}

// ─────────────────────────────────────────────
// CryoSearch Invite API
// ─────────────────────────────────────────────

export type CryoInvitePreview = {
  ownerName: string;
  itemId: string;
  itemType: string;
  itemPath: string[];
  inviteeEmail: string;
  expired: boolean;
  used: boolean;
};

/**
 * Lab owner: send an email invite to a collaborator.
 * POST /cryosearch/invite
 */
export async function sendCryoInvite(email: string, itemId: string) {
  return apiFetch<{ success: boolean }>("/cryosearch/invite", {
    method: "POST",
    body: JSON.stringify({ email, itemId }),
  });
}

/**
 * Public (no auth): preview invite metadata before showing accept screen.
 * GET /cryosearch/invite/:token
 */
export async function getCryoInvitePreview(token: string) {
  // Bypass the auth header — this is a public endpoint.
  // We use a raw fetch so no Authorization header is injected.
  const API_BASE =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")) ||
    "/api";
  const response = await fetch(`${API_BASE}/cryosearch/invite/${token}`);
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "Invite not found");
  }
  return response.json() as Promise<CryoInvitePreview>;
}

/**
 * Logged-in invitee: accept the invite.
 * POST /cryosearch/invite/:token/accept
 */
export async function acceptCryoInvite(token: string) {
  return apiFetch<{ success: boolean; itemType: string; itemPath: string[] }>(
    `/cryosearch/invite/${token}/accept`,
    { method: "POST" }
  );
}

export type AdminStats = {
  totalUsers: number;
  emailUsers: number;
  googleUsers: number;
  recentSignups: number;
  adminUsers?: number;

  users?: {
    total: number;
    email: number;
    google: number;
    admin: number;
    recentSignups: number;
  };
  materials?: {
    total: number;
    totalFiles: number;
    totalStorageBytes: number;
  };
  kits?: {
    total: number;
    published: number;
    draft: number;
  };
  courses?: {
    total: number;
    published: number;
    draft: number;
    totalModules: number;
  };
  packages?: {
    total: number;
    published: number;
  };
  enrollments?: {
    total: number;
    active: number;
    completed: number;
    expired: number;
  };
  certificates?: {
    total: number;
  };
  payments?: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    totalRevenue: number;
  };
};

export type AdminOverviewData = {
  stats: AdminStats;
  breakdowns?: {
    userDesignations: Array<{ designation: string; count: number }>;
    materialCategories: Array<{ category: string; count: number }>;
    kitCategories: Array<{ category: string; count: number }>;
    courseCategories: Array<{ category: string; count: number }>;
  };
  recent?: {
    users: AdminUser[];
    materials: StudyMaterial[];
    kits: ResearchKit[];
    courses: Array<Course & { _count?: { enrollments: number } }>;
    enrollments: Array<{
      id: string;
      status: string;
      purchasedAt: string;
      expiresAt: string;
      user: { id: string; name: string | null; email: string };
      course: { id: string; title: string } | null;
      package: { id: string; title: string } | null;
    }>;
    certificates: Array<{
      id: string;
      certificateNumber: string;
      verificationHash: string;
      issuedAt: string;
      user: { id: string; name: string | null; email: string };
      course: { id: string; title: string };
    }>;
    payments: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      provider: string;
      createdAt: string;
      user: { id: string; name: string | null; email: string };
      course: { id: string; title: string } | null;
      package: { id: string; title: string } | null;
    }>;
    consultancyBookings: Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      provider: string;
      createdAt: string;
      user: { id: string; name: string | null; email: string };
      consultant: { id: string; name: string };
      consultationType: string;
      providerPaymentId: string | null;
    }>;
  };
};

export type AdminUser = AuthUser & {
  authProvider: "email" | "google";
  hasPassword: boolean;
  updatedAt?: string;
};

export async function fetchAdminStats(): Promise<AdminOverviewData> {
  const data = await apiFetch<AdminOverviewData>("/admin/stats");
  return data;
}

export type MaintenanceScope = "WEB_PATH" | "API_PATH";

export type MaintenanceRule = {
  id: string;
  targetPath: string;
  scope: MaintenanceScope;
  enabled: boolean;
  message: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function fetchAdminMaintenanceRules() {
  const data = await apiFetch<{ rules: MaintenanceRule[] }>("/admin/maintenance");
  return data.rules;
}

export async function saveAdminMaintenanceRule(input: {
  targetPath: string;
  scope: MaintenanceScope;
  enabled: boolean;
  message?: string;
}) {
  const data = await apiFetch<{ rule: MaintenanceRule }>("/admin/maintenance", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.rule;
}

export async function updateAdminMaintenanceRule(
  id: string,
  input: {
    targetPath: string;
    scope: MaintenanceScope;
    enabled: boolean;
    message?: string;
  }
) {
  const data = await apiFetch<{ rule: MaintenanceRule }>(`/admin/maintenance/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.rule;
}

export async function deleteAdminMaintenanceRule(id: string) {
  return apiFetch<{ success: true }>(`/admin/maintenance/${id}`, { method: "DELETE" });
}


export async function fetchAdminUsers() {
  const data = await apiFetch<{ users: AdminUser[] }>("/admin/users");
  return data.users;
}

export async function fetchAdminUser(userId: string) {
  const data = await apiFetch<{ user: AdminUser }>(`/admin/users/${userId}`);
  return data.user;
}

export async function fetchAdminUserHistory(userId: string) {
  const data = await apiFetch<{
    history: Array<{
      id: string;
      title: string;
      description: string;
      timestamp: string;
      type: string;
    }>
  }>(`/admin/users/${userId}/history`);
  return data.history;
}

export async function updateAdminUserRole(userId: string, role: "USER" | "ADMIN") {
  const data = await apiFetch<{ user: AuthUser }>(`/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  return data.user;
}

export async function deleteAdminUser(userId: string) {
  return apiFetch<{ success: boolean }>(`/admin/users/${userId}`, {
    method: "DELETE",
  });
}

export type StudyMaterialFile = {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  price?: number;
  originalPrice?: number | null;
  hasAccess?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type StudyMaterial = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  price?: number;
  originalPrice?: number | null;
  hasAccess?: boolean;
  files: StudyMaterialFile[];
  createdAt: string;
  updatedAt: string;
};

export type ResourceLibrarySetting = {
  id: string;
  price: number;
  originalPrice: number | null;
  currency: string;
  updatedAt?: string;
};

export async function fetchResourceLibrarySetting() {
  const data = await apiFetch<{ setting: ResourceLibrarySetting }>("/admin/materials/settings");
  return data.setting;
}

export async function updateResourceLibrarySetting(price: number, originalPrice?: number | null) {
  const data = await apiFetch<{ setting: ResourceLibrarySetting }>("/admin/materials/settings", {
    method: "PUT",
    body: JSON.stringify({ price, originalPrice }),
  });
  return data.setting;
}

export async function fetchStudyMaterials() {
  const data = await apiFetch<{ materials: StudyMaterial[]; libraryPrice: number; libraryOriginalPrice: number | null }>("/materials");
  return { materials: data.materials, libraryPrice: data.libraryPrice ?? 0, libraryOriginalPrice: data.libraryOriginalPrice ?? null };
}

export async function fetchStudyMaterial(id: string) {
  const data = await apiFetch<{ material: StudyMaterial; libraryPrice: number }>(`/materials/${id}`);
  return { material: data.material, libraryPrice: data.libraryPrice ?? 0 };
}

export async function fetchAdminStudyMaterials() {
  const data = await apiFetch<{ materials: StudyMaterial[] }>("/admin/materials");
  return data.materials;
}

export async function uploadAdminStudyMaterial(input: {
  title: string;
  description?: string;
  category?: string;
  price?: number;
  originalPrice?: number | null;
  files: File[];
}) {
  const formData = new FormData();
  formData.append("title", input.title);
  if (input.description) {
    formData.append("description", input.description);
  }
  if (input.category) {
    formData.append("category", input.category);
  }
  if (input.price !== undefined) {
    formData.append("price", String(input.price));
  }
  if (input.originalPrice !== undefined) formData.append("originalPrice", String(input.originalPrice ?? ""));
  for (const file of input.files) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_URL}/admin/materials`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return uploadAdminStudyMaterial(input);
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as { material: StudyMaterial };
  return data.material;
}

async function uploadAdminMaterialFiles(
  materialId: string,
  files: File[],
  retry = true
) {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(`${API_URL}/admin/materials/${materialId}/files`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return uploadAdminMaterialFiles(materialId, files, false);
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as { material: StudyMaterial };
  return data.material;
}

export async function addAdminStudyMaterialFiles(materialId: string, files: File[]) {
  return uploadAdminMaterialFiles(materialId, files);
}

export async function updateAdminStudyMaterial(
  id: string,
  input: {
    title: string;
    description?: string;
    category?: string;
    price?: number;
    originalPrice?: number | null;
  }
) {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description ?? "");
  formData.append("category", input.category ?? "");
  if (input.price !== undefined) {
    formData.append("price", String(input.price));
  }
  if (input.originalPrice !== undefined) formData.append("originalPrice", String(input.originalPrice ?? ""));

  const response = await fetch(`${API_URL}/admin/materials/${id}`, {
    method: "PATCH",
    credentials: "include",
    body: formData,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return updateAdminStudyMaterial(id, input);
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as { material: StudyMaterial };
  return data.material;
}

export async function updateAdminStudyMaterialFilePrice(
  materialId: string,
  fileId: string,
  price: number
) {
  const data = await apiFetch<{ material: StudyMaterial }>(
    `/admin/materials/${materialId}/files/${fileId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ price }),
    }
  );
  return data.material;
}

export async function deleteAdminStudyMaterialFile(
  materialId: string,
  fileId: string
) {
  const data = await apiFetch<{ material: StudyMaterial }>(
    `/admin/materials/${materialId}/files/${fileId}`,
    { method: "DELETE" }
  );
  return data.material;
}

export async function deleteAdminStudyMaterial(id: string) {
  return apiFetch<{ success: boolean }>(`/admin/materials/${id}`, {
    method: "DELETE",
  });
}

export function getStudyMaterialFileViewUrl(materialId: string, fileId: string) {
  return `${API_URL}/materials/${materialId}/files/${fileId}/view`;
}

export function getStudyMaterialFileDownloadUrl(
  materialId: string,
  fileId: string
) {
  return `${API_URL}/materials/${materialId}/files/${fileId}/download`;
}

export async function downloadStudyMaterialFile(
  materialId: string,
  file: StudyMaterialFile
) {
  const url = `${getStudyMaterialFileDownloadUrl(materialId, file.id)}?t=${file.updatedAt}`;
  const response = await fetch(url, { credentials: "include" });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return downloadStudyMaterialFile(materialId, file);
    }
    throw new Error("Please sign in to download this file");
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = file.fileName;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
}

export type ResearchKit = {
  id: string;
  title: string;
  category: string;
  imageUrl: string | null;
  assays: string[];
  details: string | null;
  price: number;
  originalPrice: number | null;
  currency: string;
  stock: number;
  available: boolean;
  published: boolean;
  sortOrder: number;
  moduleId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KitModuleNode = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  children: KitModuleNode[];
  kits: ResearchKit[];
};

export async function fetchKits() {
  const response = await fetch(`${API_URL}/kits`);
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const data = (await response.json()) as { kits: ResearchKit[] };
  return data.kits;
}

export async function fetchKitTree() {
  const response = await fetch(`${API_URL}/kits/tree`);
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json() as { tree: KitModuleNode[] }).tree;
}

export async function fetchAdminKitModules() {
  const data = await apiFetch<{ modules: KitModuleNode[] }>("/admin/kit-modules");
  return data.modules;
}

export async function createAdminKitModule(input: { title: string; description?: string; parentId?: string | null; image?: File | null }) {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description ?? "");
  formData.append("parentId", input.parentId ?? "");
  if (input.image) formData.append("image", input.image);
  const response = await fetch(`${API_URL}/admin/kit-modules`, { method: "POST", credentials: "include", body: formData });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json() as { module: KitModuleNode };
  return data.module;
}

export async function updateAdminKitModule(id: string, input: Partial<Pick<KitModuleNode, "title" | "description" | "parentId" | "sortOrder">> & { image?: File | null }) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(input)) if (key !== "image" && value !== undefined) formData.append(key, value === null ? "" : String(value));
  if (input.image) formData.append("image", input.image);
  const response = await fetch(`${API_URL}/admin/kit-modules/${id}`, { method: "PATCH", credentials: "include", body: formData });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json() as { module: KitModuleNode };
  return data.module;
}

export async function deleteAdminKitModule(id: string) {
  return apiFetch<{ success: boolean }>(`/admin/kit-modules/${id}`, { method: "DELETE" });
}

export async function fetchKit(id: string) {
  const response = await fetch(`${API_URL}/kits/${id}`);
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const data = (await response.json()) as { kit: ResearchKit };
  return data.kit;
}

export async function fetchAdminKits() {
  const data = await apiFetch<{ kits: ResearchKit[] }>("/admin/kits");
  return data.kits;
}

export async function createAdminKit(input: {
  title: string;
  category: string;
  assays: string[];
  details?: string | null;
  price?: number;
  originalPrice?: number | null;
  stock?: number;
  published?: boolean;
  sortOrder?: number;
  image: File;
  moduleId?: string | null;
}) {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("category", input.category);
  formData.append("assays", JSON.stringify(input.assays));
  if (input.details !== undefined) {
    formData.append("details", input.details ?? "");
  }
  formData.append("price", String(input.price ?? 0));
  formData.append("originalPrice", String(input.originalPrice ?? ""));
  formData.append("stock", String(input.stock ?? 0));
  formData.append("published", String(input.published ?? true));
  formData.append("sortOrder", String(input.sortOrder ?? 0));
  if (input.moduleId) formData.append("moduleId", input.moduleId);
  formData.append("image", input.image);

  const response = await fetch(`${API_URL}/admin/kits`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return createAdminKit(input);
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as { kit: ResearchKit };
  return data.kit;
}

export async function updateAdminKit(
  id: string,
  input: {
    title?: string;
    category?: string;
    assays?: string[];
    details?: string | null;
    price?: number;
    originalPrice?: number | null;
    stock?: number;
    published?: boolean;
    sortOrder?: number;
    image?: File;
    moduleId?: string | null;
  }
) {
  const formData = new FormData();
  if (input.title !== undefined) {
    formData.append("title", input.title);
  }
  if (input.category !== undefined) {
    formData.append("category", input.category);
  }
  if (input.assays !== undefined) {
    formData.append("assays", JSON.stringify(input.assays));
  }
  if (input.details !== undefined) {
    formData.append("details", input.details ?? "");
  }
  if (input.price !== undefined) {
    formData.append("price", String(input.price));
  }
  if (input.originalPrice !== undefined) formData.append("originalPrice", String(input.originalPrice ?? ""));
  if (input.stock !== undefined) {
    formData.append("stock", String(input.stock));
  }
  if (input.published !== undefined) {
    formData.append("published", String(input.published));
  }
  if (input.sortOrder !== undefined) {
    formData.append("sortOrder", String(input.sortOrder));
  }
  if (input.image) {
    formData.append("image", input.image);
  }
  if (input.moduleId !== undefined) formData.append("moduleId", input.moduleId ?? "");

  const response = await fetch(`${API_URL}/admin/kits/${id}`, {
    method: "PATCH",
    credentials: "include",
    body: formData,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return updateAdminKit(id, input);
    }
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  const data = (await response.json()) as { kit: ResearchKit };
  return data.kit;
}

export async function deleteAdminKit(id: string) {
  return apiFetch<{ success: boolean }>(`/admin/kits/${id}`, {
    method: "DELETE",
  });
}

// --- Courses ---

export type CourseModule = {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  contentType: string;
  sortOrder: number;
  durationMinutes: number | null;
  isRequired: boolean;
  hasContent: boolean;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  videoWatchThreshold: number;
  questionsPerAttempt: number | null;
  contentJson?: unknown;
  storageKey?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Course = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  thumbnailUrl: string | null;
  price: number;
  originalPrice: number | null;
  currency: string;
  accessDurationDays: number;
  passingPercentage: number;
  published: boolean;
  sortOrder: number;
  moduleCount: number;
  modules?: CourseModule[];
  prerequisites?: Array<{ id: string; courseId: string; title: string }>;
  reminderMode?: string;
  reminderDaysBefore?: number[];
  createdAt: string;
  updatedAt: string;
};

export type CoursePackage = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  originalPrice: number | null;
  currency: string;
  accessDurationDays: number;
  published: boolean;
  sortOrder: number;
  courseCount: number;
  courses?: Array<{ id: string; title: string; category: string | null }>;
  createdAt: string;
  updatedAt: string;
};

export type Enrollment = {
  id: string;
  course: Course;
  status: string;
  purchasedAt: string;
  expiresAt: string;
  progressPercent: number;
  completedModules: number;
  totalModules: number;
  certificate: {
    id: string;
    certificateNumber: string;
    issuedAt: string;
  } | null;
};

export type Certificate = {
  id: string;
  certificateNumber: string;
  verificationHash: string;
  issuedAt: string;
  course: { id: string; title: string; category: string | null };
  verificationUrl: string;
};

export type ConsultancyCategory = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ConsultancyConsultant = {
  id: string;
  categoryId: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
  expertise: string[];
  experienceYears: number;
  bio: string | null;
  consultationTypes: string[];
  durationMinutes: number;
  hourlyRate: number;
  currency: string;
  available: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category: ConsultancyCategory | null;
  slots: Array<{ id: string; date: string; startTime: string; endTime: string; isBooked: boolean }>;
};

export type ConsultancyBooking = {
  id: string;
  userId: string;
  consultantId: string;
  categoryId: string;
  slotId: string;
  amount: number;
  currency: string;
  consultationType: string;
  status: string;
  provider: string;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string | null; email: string };
  userEmail?: string | null;
  notes?: string | null;
  consultant: { id: string; name: string; photoUrl: string | null; title: string | null; category: ConsultancyCategory | null };
  category: ConsultancyCategory | null;
  slot: { id: string; date: string; startTime: string; endTime: string; isBooked: boolean };
};

export async function fetchCourseCatalog() {
  const data = await apiFetch<{ courses: Course[]; packages: CoursePackage[] }>("/courses");
  return data;
}

export async function fetchPublicCourse(id: string) {
  const data = await apiFetch<{ course: Course }>(`/courses/${id}`);
  return data.course;
}

export async function fetchPublicPackage(id: string) {
  const data = await apiFetch<{ package: CoursePackage }>(`/courses/packages/${id}`);
  return data.package;
}

export async function fetchMyEnrollments() {
  const data = await apiFetch<{ enrollments: Enrollment[] }>("/courses/my/enrollments");
  return data.enrollments;
}

export async function fetchMyCertificates() {
  const data = await apiFetch<{ certificates: Certificate[] }>("/courses/my/certificates");
  return data.certificates;
}

export async function fetchMyCourse(courseId: string) {
  return apiFetch<{
    course: Course;
    enrollment: {
      status: string;
      purchasedAt: string;
      expiresAt: string;
      progressPercent: number;
    };
    moduleProgress: Array<{
      moduleId: string;
      completed: boolean;
      watchProgress: number;
      quizScore: number | null;
      quizPassed: boolean | null;
      assignmentSubmitted: boolean;
    }>;
    certificate: { certificateNumber: string; issuedAt: string } | null;
  }>(`/courses/my/${courseId}`);
}

export async function fetchCourseAccess(courseId: string) {
  return apiFetch<{
    enrolled: boolean;
    prerequisitesMet: boolean;
    locked: boolean;
    prerequisites: Array<{ courseId: string }>;
  }>(`/courses/my/${courseId}/access`);
}

export function getModuleContentUrl(courseId: string, moduleId: string) {
  return `${API_URL}/courses/my/${courseId}/modules/${moduleId}/content`;
}

export async function updateModuleProgress(
  courseId: string,
  moduleId: string,
  watchProgress: number
) {
  return apiFetch<{ watchProgress: number; completed: boolean }>(
    `/courses/my/${courseId}/modules/${moduleId}/progress`,
    { method: "POST", body: JSON.stringify({ watchProgress }) }
  );
}

export async function submitQuiz(
  courseId: string,
  moduleId: string,
  answers: Record<string, number>
) {
  return apiFetch<{
    score: number;
    correct: number;
    total: number;
    passed: boolean;
    passingPercentage: number;
  }>(`/courses/my/${courseId}/modules/${moduleId}/quiz`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

export async function submitAssignment(
  courseId: string,
  moduleId: string,
  submission: string
) {
  return apiFetch<{ submitted: boolean }>(
    `/courses/my/${courseId}/modules/${moduleId}/assignment`,
    { method: "POST", body: JSON.stringify({ submission }) }
  );
}

export async function completeModule(courseId: string, moduleId: string) {
  return apiFetch<{ completed: boolean }>(
    `/courses/my/${courseId}/modules/${moduleId}/complete`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

export async function createPaymentOrder(input: {
  courseId?: string;
  packageId?: string;
  kitId?: string;
  resourceScope?: "FULL_LIBRARY" | "MODULE" | "FILE";
  studyMaterialId?: string;
  studyMaterialFileId?: string;
  quantity?: number;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
}) {
  return apiFetch<{
    free?: boolean;
    paymentId?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
  }>("/payments/create-order", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function verifyPayment(input: {
  paymentId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return apiFetch<{ success: boolean }>("/payments/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type KitFulfillmentStatus =
  | "PROCESSING"
  | "CONFIRMED"
  | "PACKED"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export type KitOrderEvent = {
  id: string;
  status: KitFulfillmentStatus;
  note: string | null;
  location: string | null;
  createdAt: string;
  actor?: { name: string | null; email: string } | null;
};

export type KitOrder = {
  id: string;
  createdAt: string;
  completedAt: string | null;
  amount: number;
  currency: string;
  quantity: number;
  itemTitle: string;
  imageUrl: string | null;
  paymentStatus: string;
  fulfillmentStatus: KitFulfillmentStatus;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDeliveryAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  events: KitOrderEvent[];
  user?: { id: string; name: string | null; email: string };
};

export async function fetchKitOrders() {
  const data = await apiFetch<{ orders: KitOrder[] }>("/payments/kits");
  return data.orders;
}

export async function fetchKitOrder(id: string) {
  const data = await apiFetch<{ order: KitOrder }>(`/payments/kits/${id}`);
  return data.order;
}

export async function fetchAdminKitOrders(input?: {
  page?: number;
  pageSize?: number;
  status?: KitFulfillmentStatus;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (input?.page) params.set("page", String(input.page));
  if (input?.pageSize) params.set("pageSize", String(input.pageSize));
  if (input?.status) params.set("status", input.status);
  if (input?.search) params.set("search", input.search);
  const query = params.toString();
  return apiFetch<{ orders: KitOrder[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }>(
    `/admin/orders${query ? `?${query}` : ""}`
  );
}

export async function fetchAdminKitOrder(id: string) {
  const data = await apiFetch<{ order: KitOrder }>(`/admin/orders/${id}`);
  return data.order;
}

export async function updateAdminKitOrder(
  id: string,
  input: {
    status?: KitFulfillmentStatus;
    carrier?: string | null;
    trackingNumber?: string | null;
    estimatedDeliveryAt?: string | null;
    note?: string | null;
    location?: string | null;
  },
) {
  const data = await apiFetch<{ order: KitOrder }>(`/admin/orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.order;
}

export type LiveClass = {
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  courseId: string | null;
  scheduledAt: string;
  startTime: string;
  duration: number;
  maxParticipants: number;
  price: number;
  originalPrice: number | null;
  currency: string;
  isPaid: boolean;
  studentCameraEnabled: boolean;
  studentMicrophoneEnabled: boolean;
  chatEnabled: boolean;
  recordingEnabled: boolean;
  status: "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  teacher: { id: string; name: string | null; email: string; avatarUrl: string | null };
  course: { id: string; title: string } | null;
  _count: { enrollments: number; attendance: number };
  isEnrolled?: boolean;
};

export async function fetchLiveClasses() {
  const data = await apiFetch<{ classes: LiveClass[] }>("/live-classes");
  return data.classes;
}

export async function fetchLiveClass(id: string) {
  const data = await apiFetch<{ class: LiveClass }>(`/live-classes/${id}`);
  return data.class;
}

export async function createLiveClassToken(id: string) {
  return apiFetch<{
    token: string;
    url: string;
    attendanceId: string;
    permissions: { camera: boolean; microphone: boolean; chat: boolean };
  }>(`/live-classes/${id}/token`, { method: "POST", body: JSON.stringify({}) });
}

export async function leaveLiveClass(id: string, attendanceId: string) {
  return apiFetch<{ success: boolean }>(`/live-classes/${id}/leave`, {
    method: "POST",
    body: JSON.stringify({ attendanceId }),
  });
}

export async function createLiveClassPaymentOrder(id: string) {
  return apiFetch<{
    free?: boolean;
    paymentId?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string;
  }>(`/live-classes/${id}/payment/order`, { method: "POST", body: JSON.stringify({}) });
}

export async function verifyLiveClassPayment(id: string, input: {
  paymentId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return apiFetch<{ success: boolean }>(`/live-classes/${id}/payment/verify`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchAdminLiveClasses() {
  const data = await apiFetch<{ classes: LiveClass[] }>("/live-classes");
  return data.classes;
}

export async function createAdminLiveClass(input: Record<string, unknown>) {
  const data = await apiFetch<{ class: LiveClass }>("/live-classes", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.class;
}

export async function updateAdminLiveClass(id: string, input: Record<string, unknown>) {
  const data = await apiFetch<{ class: LiveClass }>(`/live-classes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.class;
}

export async function deleteAdminLiveClass(id: string) {
  return apiFetch<{ success: boolean }>(`/live-classes/${id}`, { method: "DELETE" });
}

export async function verifyCertificate(certificateNumber: string) {
  const response = await fetch(`${API_URL}/certificates/${certificateNumber}`);
  if (!response.ok) {
    throw new Error("Certificate not found");
  }
  return response.json() as Promise<{
    valid: boolean;
    certificateNumber: string;
    verificationHash: string;
    issuedAt: string;
    recipientName: string;
    courseTitle: string;
    courseCategory: string | null;
  }>;
}

export async function fetchConsultancyCategories() {
  const data = await apiFetch<{ categories: ConsultancyCategory[] }>("/consultancy/categories");
  return data.categories;
}

export async function fetchConsultancyConsultants(categoryId?: string) {
  const query = categoryId ? `?categoryId=${encodeURIComponent(categoryId)}` : "";
  const data = await apiFetch<{ consultants: ConsultancyConsultant[] }>(`/consultancy/consultants${query}`);
  return data.consultants;
}

export async function fetchConsultancyConsultant(id: string) {
  const data = await apiFetch<{ consultant: ConsultancyConsultant }>(`/consultancy/consultants/${id}`);
  return data.consultant;
}

export async function fetchConsultancySlots(consultantId: string, date: string) {
  const data = await apiFetch<{ slots: Array<{ id: string; date: string; startTime: string; endTime: string; isBooked: boolean }> }>(`/consultancy/consultants/${consultantId}/slots?date=${encodeURIComponent(date)}`);
  return data.slots;
}

export async function createConsultancyBookingOrder(input: {
  consultantId: string;
  slotId: string;
  consultationType: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  notes?: string;
}) {
  return apiFetch<{ bookingId: string; orderId: string; amount: number; currency: string; keyId: string }>("/consultancy/create-order", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function verifyConsultancyPayment(input: {
  bookingId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return apiFetch<{ success: boolean }>("/consultancy/verify", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function cancelConsultancyBooking(bookingId: string) {
  return apiFetch<{ success: boolean }>(`/consultancy/bookings/${bookingId}`, {
    method: "DELETE",
  });
}

export async function fetchMyConsultancyBookings() {
  const data = await apiFetch<{ bookings: ConsultancyBooking[] }>('/consultancy/my-bookings');
  return data.bookings;
}

export async function fetchAdminConsultancyCategories() {
  const data = await apiFetch<{ categories: ConsultancyCategory[] }>('/admin/consultancy/categories');
  return data.categories;
}

export async function createAdminConsultancyCategory(input: { name: string; description?: string; color?: string; published?: boolean; sortOrder?: number }) {
  const data = await apiFetch<{ category: ConsultancyCategory }>('/admin/consultancy/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.category;
}

export async function updateAdminConsultancyCategory(id: string, input: Partial<ConsultancyCategory>) {
  const data = await apiFetch<{ category: ConsultancyCategory }>(`/admin/consultancy/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return data.category;
}

export async function deleteAdminConsultancyCategory(id: string) {
  return apiFetch<{ success: boolean }>(`/admin/consultancy/categories/${id}`, { method: 'DELETE' });
}

export async function fetchAdminConsultancyConsultants() {
  const data = await apiFetch<{ consultants: ConsultancyConsultant[] }>('/admin/consultancy/consultants');
  return data.consultants;
}

export async function createAdminConsultancyConsultant(input: {
  categoryId?: string;
  name: string;
  title?: string;
  bio?: string;
  hourlyRate?: number;
  experienceYears?: number;
  image?: File;
}) {
  const formData = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value instanceof File ? value : String(value));
  });
  const response = await fetch(`${API_URL}/admin/consultancy/consultants`, { method: 'POST', credentials: 'include', body: formData });
  if (response.status === 401 && await refreshAccessToken()) return createAdminConsultancyConsultant(input);
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { consultant: ConsultancyConsultant };
  return data.consultant;
}

export async function updateAdminConsultancyConsultant(id: string, input: Partial<ConsultancyConsultant> & { categoryId?: string; image?: File }) {
  const formData = new FormData();
  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined && value !== null) formData.append(key, value instanceof File ? value : String(value));
  });
  const response = await fetch(`${API_URL}/admin/consultancy/consultants/${id}`, { method: 'PATCH', credentials: 'include', body: formData });
  if (response.status === 401 && await refreshAccessToken()) return updateAdminConsultancyConsultant(id, input);
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { consultant: ConsultancyConsultant };
  return data.consultant;
}

export async function deleteAdminConsultancyConsultant(id: string) {
  return apiFetch<{ success: boolean }>(`/admin/consultancy/consultants/${id}`, { method: 'DELETE' });
}

export async function createAdminConsultancySlot(consultantId: string, input: { date: string; startTime: string; endTime: string }) {
  const data = await apiFetch<{ slot: { id: string; date: string; startTime: string; endTime: string; isBooked: boolean } }>(`/admin/consultancy/consultants/${consultantId}/slots`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data.slot;
}

export async function deleteAdminConsultancySlot(id: string) {
  return apiFetch<{ success: boolean }>(`/admin/consultancy/slots/${id}`, { method: 'DELETE' });
}

export async function fetchAdminConsultancyBookings() {
  const data = await apiFetch<{ bookings: ConsultancyBooking[] }>('/admin/consultancy/bookings');
  return data.bookings;
}

export async function updateAdminConsultancyBooking(id: string, status: string) {
  const data = await apiFetch<{ booking: ConsultancyBooking }>(`/admin/consultancy/bookings/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return data.booking;
}

export async function fetchAdminCourses() {
  const data = await apiFetch<{ courses: Course[] }>("/admin/courses");
  return data.courses;
}

export async function fetchAdminCourse(id: string) {
  const data = await apiFetch<{ course: Course }>(`/admin/courses/${id}`);
  return data.course;
}

export async function createAdminCourse(input: FormData) {
  const response = await fetch(`${API_URL}/admin/courses`, {
    method: "POST",
    credentials: "include",
    body: input,
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { course: Course };
  return data.course;
}

export async function updateAdminCourse(id: string, input: FormData) {
  const response = await fetch(`${API_URL}/admin/courses/${id}`, {
    method: "PATCH",
    credentials: "include",
    body: input,
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { course: Course };
  return data.course;
}

export async function deleteAdminCourse(id: string) {
  return apiFetch<{ success: boolean }>(`/admin/courses/${id}`, { method: "DELETE" });
}

export async function createAdminModule(courseId: string, input: FormData) {
  const response = await fetch(`${UPLOAD_API_URL}/admin/courses/${courseId}/modules`, {
    method: "POST",
    credentials: "include",
    headers: getUploadHeaders(),
    body: input,
  });
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return createAdminModule(courseId, input);
  }
  if (!response.ok) throw new Error(await parseError(response));
  const data = (await response.json()) as { module: CourseModule };
  return data.module;
}

export type VideoUploadSignature = {
  cloudName: string;
  apiKey: string;
  publicId: string;
  folder: string;
  timestamp: number;
  signature: string;
};

export async function getAdminVideoUploadSignature(courseId: string) {
  const response = await fetch(
    `${UPLOAD_API_URL}/admin/courses/${courseId}/video-upload-signature`,
    { method: "POST", credentials: "include", headers: getUploadHeaders() }
  );
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return getAdminVideoUploadSignature(courseId);
  }
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as VideoUploadSignature;
}

export function uploadVideoDirectly(
  file: File,
  signature: VideoUploadSignature,
  onProgress: (progress: number) => void
) {
  return new Promise<{ public_id: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `https://api.cloudinary.com/v1_1/${signature.cloudName}/video/upload`);
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    request.addEventListener("load", () => {
      let data: { public_id?: string; error?: { message?: string } };
      try {
        data = JSON.parse(request.responseText || "{}");
      } catch {
        reject(new Error(`Cloudinary upload failed (HTTP ${request.status})`));
        return;
      }
      if (request.status >= 200 && request.status < 300 && data.public_id) {
        resolve(data as { public_id: string });
      } else {
        reject(new Error(data.error?.message || "Cloudinary video upload failed"));
      }
    });
    request.addEventListener("error", () => reject(new Error("Network error while uploading video")));
    request.addEventListener("abort", () => reject(new Error("Video upload was cancelled")));
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.apiKey);
    form.append("timestamp", String(signature.timestamp));
    form.append("signature", signature.signature);
    form.append("folder", signature.folder);
    form.append("public_id", signature.publicId);
    request.send(form);
  });
}

export async function updateAdminModule(
  courseId: string,
  moduleId: string,
  input: FormData
) {
  const response = await fetch(
    `${UPLOAD_API_URL}/admin/courses/${courseId}/modules/${moduleId}`,
    { method: "PATCH", credentials: "include", headers: getUploadHeaders(), body: input }
  );
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return updateAdminModule(courseId, moduleId, input);
  }
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as { module: CourseModule };
}

function getUploadHeaders() {
  const headers = new Headers();
  const accessToken = getAccessToken();
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  return headers;
}

export async function deleteAdminModule(courseId: string, moduleId: string) {
  return apiFetch<{ success: boolean }>(
    `/admin/courses/${courseId}/modules/${moduleId}`,
    { method: "DELETE" }
  );
}

export async function reorderAdminModules(courseId: string, moduleIds: string[]) {
  return apiFetch<{ modules: CourseModule[] }>(
    `/admin/courses/${courseId}/modules/reorder`,
    { method: "POST", body: JSON.stringify({ moduleIds }) }
  );
}

export async function importQuizFromExcel(
  courseId: string,
  moduleId: string,
  file: File
): Promise<{ imported: number; warnings: string[]; message: string }> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(
    `${UPLOAD_API_URL}/admin/courses/${courseId}/modules/${moduleId}/quiz-import`,
    { method: "POST", credentials: "include", headers: getUploadHeaders(), body: form }
  );
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return importQuizFromExcel(courseId, moduleId, file);
  }
  if (!response.ok) throw new Error(await parseError(response));
  return response.json() as Promise<{ imported: number; warnings: string[]; message: string }>;
}

export async function updateQuizSettings(
  courseId: string,
  moduleId: string,
  questionsPerAttempt: number | null
) {
  return apiFetch<{ module: CourseModule }>(
    `/admin/courses/${courseId}/modules/${moduleId}/quiz-settings`,
    {
      method: "PATCH",
      body: JSON.stringify({ questionsPerAttempt }),
    }
  );
}

export async function addCoursePrerequisite(courseId: string, prerequisiteCourseId: string) {
  return apiFetch<{ prerequisite: { id: string; courseId: string; title: string } }>(
    `/admin/courses/${courseId}/prerequisites`,
    { method: "POST", body: JSON.stringify({ prerequisiteCourseId }) }
  );
}

export async function removeCoursePrerequisite(courseId: string, prereqId: string) {
  return apiFetch<{ success: boolean }>(
    `/admin/courses/${courseId}/prerequisites/${prereqId}`,
    { method: "DELETE" }
  );
}

export async function fetchAdminPackages() {
  const data = await apiFetch<{ packages: CoursePackage[] }>("/admin/packages");
  return data.packages;
}

export async function createAdminPackage(input: {
  title: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  currency?: string;
  accessDurationDays?: number;
  published?: boolean;
  sortOrder?: number;
  courseIds?: string[];
}) {
  const data = await apiFetch<{ package: CoursePackage }>("/admin/packages", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.package;
}

export async function updateAdminPackage(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    price: number;
    originalPrice?: number | null;
    currency: string;
    accessDurationDays: number;
    published: boolean;
    sortOrder: number;
    courseIds: string[];
  }>
) {
  const data = await apiFetch<{ package: CoursePackage }>(`/admin/packages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.package;
}

export async function deleteAdminPackage(id: string) {
  return apiFetch<{ success: boolean }>(`/admin/packages/${id}`, { method: "DELETE" });
}

export async function fetchAdminCourseEnrollments(courseId: string) {
  const data = await apiFetch<{
    enrollments: Array<{
      id: string;
      user: { id: string; name: string | null; email: string };
      status: string;
      purchasedAt: string;
      expiresAt: string;
      progressPercent: number;
      hasCertificate: boolean;
      certificateNumber?: string;
    }>;
  }>(`/admin/courses/${courseId}/enrollments`);
  return data.enrollments;
}

export async function fetchAdminCertificates() {
  const data = await apiFetch<{
    certificates: Array<{
      id: string;
      certificateNumber: string;
      verificationHash: string;
      issuedAt: string;
      user: { id: string; name: string | null; email: string };
      course: { id: string; title: string };
    }>;
  }>("/admin/certificates");
  return data.certificates;
}

export async function sendCourseReminders() {
  return apiFetch<{ sent: number; checked: number }>("/admin/reminders/send", {
    method: "POST",
    body: JSON.stringify({}),
  });
}


// ─── Budget Management ────────────────────────────────────────────────────────

export type BudgetFieldType = "TEXT" | "NUMBER" | "DATE";
export type BudgetFieldDirection = "EXPENSE" | "ADDITION" | "NONE";

export type BudgetHead = {
  id: string;
  budgetId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BudgetFormField = {
  id: string;
  budgetId: string;
  headId: string | null;
  label: string;
  fieldType: BudgetFieldType;
  direction: BudgetFieldDirection;
  defaultValue: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type BudgetSubmissionValue = {
  fieldId: string;
  label: string;
  fieldType: BudgetFieldType;
  direction: BudgetFieldDirection;
  value: string;
};

export type BudgetSubmission = {
  id: string;
  submittedAt: string;
  netEffect: number;
  note: string | null;
  headId: string | null;
  user: { id: string; name: string | null; email: string };
  values: BudgetSubmissionValue[];
};

export type Budget = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  allocatedAmount: number; // paise
  currency: string;
  createdAt: string;
  updatedAt: string;
  fields: BudgetFormField[];
  heads: BudgetHead[];
  // summary
  submissionCount: number;
  netSpent: number;
  remaining: number;
};

// ── Budgets ───────────────────────────────────────────────────────────────────

export async function fetchBudgets() {
  const data = await apiFetch<{ budgets: Budget[] }>("/budgets");
  return data.budgets;
}

export async function createBudget(input: {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  allocatedAmount: number; // rupees decimal
  currency?: string;
}) {
  const data = await apiFetch<{ budget: Budget }>("/budgets", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.budget;
}

export async function fetchBudget(budgetId: string) {
  const data = await apiFetch<{ budget: Budget; submissions: BudgetSubmission[] }>(
    `/budgets/${budgetId}`
  );
  return data;
}

export async function updateBudget(
  budgetId: string,
  input: {
    name?: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
    allocatedAmount?: number;
    currency?: string;
  }
) {
  const data = await apiFetch<{ budget: Budget }>(`/budgets/${budgetId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.budget;
}

export async function deleteBudget(budgetId: string) {
  return apiFetch<{ success: boolean }>(`/budgets/${budgetId}`, { method: "DELETE" });
}

// ── Per-budget fields ─────────────────────────────────────────────────────────

export async function createBudgetField(
  budgetId: string,
  input: {
    label: string;
    fieldType: BudgetFieldType;
    direction?: BudgetFieldDirection;
    defaultValue?: string;
    sortOrder?: number;
    headId?: string;
  }
) {
  const data = await apiFetch<{ field: BudgetFormField }>(
    `/budgets/${budgetId}/fields`,
    { method: "POST", body: JSON.stringify(input) }
  );
  return data.field;
}

export async function updateBudgetField(
  budgetId: string,
  fieldId: string,
  input: {
    label?: string;
    fieldType?: BudgetFieldType;
    direction?: BudgetFieldDirection;
    defaultValue?: string;
    sortOrder?: number;
  }
) {
  const data = await apiFetch<{ field: BudgetFormField }>(
    `/budgets/${budgetId}/fields/${fieldId}`,
    { method: "PATCH", body: JSON.stringify(input) }
  );
  return data.field;
}

export async function deleteBudgetField(budgetId: string, fieldId: string) {
  return apiFetch<{ success: boolean }>(
    `/budgets/${budgetId}/fields/${fieldId}`,
    { method: "DELETE" }
  );
}

// ── Budget Heads ──────────────────────────────────────────────────────────────

export async function createBudgetHead(budgetId: string, input: { name: string; description?: string }) {
  const data = await apiFetch<{ head: BudgetHead }>(`/budgets/${budgetId}/heads`, {
    method: "POST", body: JSON.stringify(input),
  });
  return data.head;
}

export async function updateBudgetHead(budgetId: string, headId: string, input: { name?: string; description?: string }) {
  const data = await apiFetch<{ head: BudgetHead }>(`/budgets/${budgetId}/heads/${headId}`, {
    method: "PATCH", body: JSON.stringify(input),
  });
  return data.head;
}

export async function deleteBudgetHead(budgetId: string, headId: string) {
  return apiFetch<{ success: boolean }>(`/budgets/${budgetId}/heads/${headId}`, { method: "DELETE" });
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function submitBudgetForm(
  budgetId: string,
  values: Record<string, string>,
  note?: string,
  headId?: string
) {
  const data = await apiFetch<{ submission: BudgetSubmission }>(
    `/budgets/${budgetId}/submissions`,
    { method: "POST", body: JSON.stringify({ values, note, headId }) }
  );
  return data.submission;
}

export async function deleteBudgetSubmission(budgetId: string, submissionId: string) {
  return apiFetch<{ success: boolean }>(
    `/budgets/${budgetId}/submissions/${submissionId}`,
    { method: "DELETE" }
  );
}

// ── Lab Log-Book & Instrument Logbook ───────────────────────────────────────

export type InstrumentStatus = "ACTIVE" | "UNDER_MAINTENANCE" | "OUT_OF_SERVICE" | "ARCHIVED";
export type BookingStatus = "CONFIRMED" | "CANCELLED";

export type PlanType = "SINGLE_USER" | "TEAM_ADMIN_5";
export type ModuleKey = "STOCK" | "CRYO" | "LOGBOOK" | "BUDGET";

export type LogbookPermission = {
  canViewLogbook: boolean;
  canCreateEntries: boolean;
  canEditOwnEntries: boolean;
  canEditOthersEntries: boolean;
  canManageInstruments: boolean;
  canGenerateReports: boolean;
  // Stock permissions
  canViewStock?: boolean;
  canAddStock?: boolean;
  canEditStock?: boolean;
  canIssueStock?: boolean;
  canRestockStock?: boolean;
  canManageStockSettings?: boolean;
  // Cryo permissions
  canViewCryo?: boolean;
  canAddCryo?: boolean;
  canEditCryo?: boolean;
  canManageCryoSettings?: boolean;
  // Budget permissions
  canViewBudget?: boolean;
  canCreateBudget?: boolean;
  canEditBudget?: boolean;
  canManageBudgetSettings?: boolean;
};

export type ComprehensivePermission = LogbookPermission;

export type LabPlanEntitlements = {
  labId: string;
  labName: string;
  planType: PlanType;
  maxSeats: number;
  enabledModules: ModuleKey[];
  activeSeats: number;
  pendingInvitesCount: number;
  remainingSeats: number;
};

export type LogbookInstrument = {
  id: string;
  code: string;
  name: string;
  installedOn: string | null;
  lastServiceDate: string | null;
  lastCleaningDate: string | null;
  nextServiceDate: string | null;
  inchargeName: string | null;
  inchargeContact: string | null;
  description: string | null;
  status: InstrumentStatus;
  createdAt: string;
  updatedAt: string;
  todayBookingsCount?: number;
  nextBookingTime?: string | null;
  isServiceDueSoon?: boolean;
};

export type LogbookBooking = {
  id: string;
  instrumentId: string;
  userId: string;
  userName: string;
  date: string;
  startTime: string;
  endTime: string;
  startDateTime: string;
  endDateTime: string;
  remarks: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  instrument?: { id: string; name: string; code: string; status?: InstrumentStatus };
  user?: { id: string; name: string | null; email: string; avatarUrl: string | null };
};

export type LabWorkspaceItem = {
  id: string;
  name: string;
  description: string | null;
  isOwner: boolean;
  role: string;
  membersCount: number;
};

export type LabInviteItem = {
  id: string;
  email: string;
  token: string;
  status: "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
  createdAt: string;
  expiresAt: string;
};

export type LabTeamMember = {
  id: string;
  memberId: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  designation: string | null;
  permissions: LogbookPermission;
};

export type LogbookUserWithPermissions = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  designation: string | null;
  permissions: LogbookPermission;
};

export type LogbookActivity = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  instrumentId: string | null;
  createdAt: string;
};

export type LogbookReportRow = {
  id: string;
  date: string;
  instrumentName: string;
  instrumentCode: string;
  user: string;
  startTime: string;
  endTime: string;
  durationHours: string;
  remarks: string;
};

// ─── Notebook block types (rich editor) ──────────────────────────────────────

export type NotebookBlockType = "text" | "image";

export type NotebookTextBlock = {
  type: "text";
  id: string;
  content: string; // HTML from contentEditable
};

export type NotebookImageBlock = {
  type: "image";
  id: string;
  url: string;
  storageKey?: string;
  caption?: string;
  width?: number; // percentage of container
};

export type NotebookBlock = NotebookTextBlock | NotebookImageBlock;

export type LabNotebookEntry = {
  id: string;
  userId: string;
  userName: string;
  date: string;
  content: string;
  richContent?: NotebookBlock[] | null;
  entryTime?: string | null;
  summary?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotebookHistoryItem = {
  id: string;
  date: string;
  summary: string | null;
  entryTime: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotebookTaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export type NotebookTask = {
  id: string;
  labId: string | null;
  title: string;
  description: string | null;
  dueDate: string | null;
  status: NotebookTaskStatus;
  completedAt: string | null;
  completedNote: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; email: string; avatarUrl: string | null };
  assignedBy: { id: string; name: string; email: string };
};

export type NotebookActivityLog = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  labId: string | null;
  entryId: string | null;
  targetUserId: string | null;
  createdAt: string;
};

export type AdminNotebookUserView = {
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  entry: Omit<LabNotebookEntry, "userId" | "userName"> | null;
};

export async function fetchUserLabs() {
  const data = await apiFetch<{ labs: LabWorkspaceItem[] }>("/logbook/labs");
  return data.labs;
}

export async function createLabWorkspace(input: { name: string; description?: string }) {
  const data = await apiFetch<{ lab: LabWorkspaceItem }>("/logbook/labs", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.lab;
}

export async function fetchLabTeam(labId: string) {
  return apiFetch<{
    labId: string;
    labName: string;
    isOwner: boolean;
    userRole: string;
    members: LabTeamMember[];
    pendingInvites: LabInviteItem[];
  }>(`/logbook/labs/${labId}/team`);
}

export async function sendLabInvite(labId: string, email: string) {
  return apiFetch<{ success: true; invite: LabInviteItem }>(`/logbook/labs/${labId}/invites`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function cancelLabInvite(labId: string, inviteId: string) {
  return apiFetch<{ success: true }>(`/logbook/labs/${labId}/invites/${inviteId}`, {
    method: "DELETE",
  });
}

export async function acceptLabInvite(token: string) {
  return apiFetch<{ success: true; labId: string; labName: string; memberId: string }>("/logbook/invites/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function updateLabMemberPermission(labId: string, userId: string, input: Partial<LogbookPermission>) {
  const data = await apiFetch<{ permission: LogbookPermission }>(`/logbook/labs/${labId}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.permission;
}

export async function fetchLogbookInstruments(labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  return apiFetch<{ instruments: LogbookInstrument[]; permissions: LogbookPermission; labId?: string; labName?: string }>(`/logbook/instruments${query}`);
}

export async function fetchLogbookInstrument(id: string, labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  return apiFetch<{ instrument: LogbookInstrument & { bookings: LogbookBooking[] } }>(`/logbook/instruments/${id}${query}`);
}

export async function createLogbookInstrument(input: {
  code: string;
  name: string;
  installedOn?: string | null;
  lastServiceDate?: string | null;
  lastCleaningDate?: string | null;
  nextServiceDate?: string | null;
  inchargeName?: string | null;
  inchargeContact?: string | null;
  description?: string | null;
  status?: InstrumentStatus;
}, labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ instrument: LogbookInstrument }>(`/logbook/instruments${query}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.instrument;
}

export async function updateLogbookInstrument(id: string, input: Partial<Omit<LogbookInstrument, "id" | "createdAt" | "updatedAt">>, labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ instrument: LogbookInstrument }>(`/logbook/instruments/${id}${query}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.instrument;
}

export async function archiveLogbookInstrument(id: string, labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  return apiFetch<{ success: true; instrument: LogbookInstrument }>(`/logbook/instruments/${id}${query}`, {
    method: "DELETE",
  });
}

export async function fetchLogbookBookings(params: { instrumentId?: string; date?: string; fromDate?: string; toDate?: string; labId?: string }) {
  const query = new URLSearchParams();
  if (params.instrumentId) query.set("instrumentId", params.instrumentId);
  if (params.date) query.set("date", params.date);
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.labId) query.set("labId", params.labId);

  const data = await apiFetch<{ bookings: LogbookBooking[] }>(`/logbook/bookings?${query.toString()}`);
  return data.bookings;
}

export async function createLogbookBooking(input: {
  instrumentId: string;
  date: string;
  startTime: string;
  endTime: string;
  remarks?: string;
}, labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ booking: LogbookBooking }>(`/logbook/bookings${query}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.booking;
}

export async function updateLogbookBooking(id: string, input: { date?: string; startTime?: string; endTime?: string; remarks?: string }, labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ booking: LogbookBooking }>(`/logbook/bookings/${id}${query}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.booking;
}

export async function cancelLogbookBooking(id: string, labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  return apiFetch<{ success: true; booking: LogbookBooking }>(`/logbook/bookings/${id}${query}`, {
    method: "DELETE",
  });
}

export async function fetchLogbookPermissions(labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ users: LogbookUserWithPermissions[] }>(`/logbook/permissions${query}`);
  return data.users;
}

export async function updateLogbookPermission(userId: string, input: Partial<LogbookPermission>, labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ permission: LogbookPermission }>(`/logbook/permissions/${userId}${query}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.permission;
}

export async function getLabPlan(labId: string) {
  return apiFetch<LabPlanEntitlements>(`/logbook/labs/${labId}/plan`);
}

export async function updateLabPlan(labId: string, payload: { planType?: PlanType; enabledModules?: ModuleKey[] }) {
  return apiFetch<{ success: boolean; plan: LabPlanEntitlements }>(`/logbook/labs/${labId}/plan`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateMemberAccessRights(labId: string, memberUserId: string, permissions: Partial<ComprehensivePermission>) {
  return apiFetch<{ permission: ComprehensivePermission }>(`/logbook/labs/${labId}/members/${memberUserId}`, {
    method: "PATCH",
    body: JSON.stringify(permissions),
  });
}

export async function fetchLogbookActivities(instrumentId?: string, labId?: string) {
  const query = new URLSearchParams();
  if (instrumentId) query.set("instrumentId", instrumentId);
  if (labId) query.set("labId", labId);

  const queryString = query.toString() ? `?${query.toString()}` : "";
  const data = await apiFetch<{ activities: LogbookActivity[] }>(`/logbook/activities${queryString}`);
  return data.activities;
}

export async function fetchLogbookReport(params: { instrumentId?: string; fromDate?: string; toDate?: string; userId?: string; labId?: string }) {
  const query = new URLSearchParams();
  if (params.instrumentId) query.set("instrumentId", params.instrumentId);
  if (params.fromDate) query.set("fromDate", params.fromDate);
  if (params.toDate) query.set("toDate", params.toDate);
  if (params.userId) query.set("userId", params.userId);
  if (params.labId) query.set("labId", params.labId);

  return apiFetch<{ reportRows: LogbookReportRow[]; totalBookings: number }>(`/logbook/reports?${query.toString()}`);
}

export async function fetchLabNotebookEntry(date?: string, labId?: string) {
  const query = new URLSearchParams();
  if (date) query.set("date", date);
  if (labId) query.set("labId", labId);

  const queryString = query.toString() ? `?${query.toString()}` : "";
  return apiFetch<{ date: string; entry: LabNotebookEntry | null }>(`/logbook/notebook${queryString}`);
}

export async function saveLabNotebookEntry(
  content: string,
  date?: string,
  labId?: string,
  richContent?: NotebookBlock[] | null,
  entryTime?: string | null,
  summary?: string | null,
) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ entry: LabNotebookEntry }>(`/logbook/notebook${query}`, {
    method: "POST",
    body: JSON.stringify({ content, date, richContent, entryTime, summary }),
  });
  return data.entry;
}

export async function fetchNotebookHistory(labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ history: NotebookHistoryItem[] }>(`/logbook/notebook/history${query}`);
  return data.history;
}

export async function uploadNotebookImage(file: File, labId?: string): Promise<{ url: string; storageKey: string; publicId: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const query = labId ? `?labId=${labId}` : "";

  const { getAccessToken } = await import("@/lib/auth-storage");
  const token = getAccessToken();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

  const res = await fetch(`${API_URL}/logbook/notebook/image${query}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Upload failed" }));
    throw new Error((err as { error: string }).error || "Upload failed");
  }
  return res.json();
}

// ── Notebook Tasks ─────────────────────────────────────────────────────────────

export async function fetchNotebookTasks(labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ tasks: NotebookTask[] }>(`/logbook/notebook/tasks${query}`);
  return data.tasks;
}

export async function createNotebookTask(input: {
  assignedToId: string;
  title: string;
  description?: string;
  dueDate?: string;
}, labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ task: NotebookTask }>(`/logbook/notebook/tasks${query}`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.task;
}

export async function updateNotebookTask(
  taskId: string,
  input: {
    status?: NotebookTaskStatus;
    completedNote?: string;
    title?: string;
    description?: string;
    dueDate?: string | null;
  },
) {
  const data = await apiFetch<{ task: NotebookTask }>(`/logbook/notebook/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.task;
}

export async function deleteNotebookTask(taskId: string) {
  return apiFetch<{ success: true }>(`/logbook/notebook/tasks/${taskId}`, {
    method: "DELETE",
  });
}

// ── Notebook Activity Log ─────────────────────────────────────────────────────

export async function fetchNotebookActivityLog(labId?: string) {
  const query = labId ? `?labId=${labId}` : "";
  const data = await apiFetch<{ logs: NotebookActivityLog[]; isAdmin: boolean }>(`/logbook/notebook/activity${query}`);
  return data;
}

// ── Admin multi-user notebook view ────────────────────────────────────────────

export async function fetchAdminNotebookUsers(userIds: string[], date?: string, labId?: string) {
  const query = new URLSearchParams();
  query.set("userIds", userIds.join(","));
  if (date) query.set("date", date);
  if (labId) query.set("labId", labId);
  const data = await apiFetch<{ notebooks: AdminNotebookUserView[]; date: string }>(
    `/logbook/notebook/admin/users?${query.toString()}`
  );
  return data;
}

export async function fetchAdminNotebookHistory(userId: string, labId?: string) {
  const query = new URLSearchParams();
  query.set("userId", userId);
  if (labId) query.set("labId", labId);
  const data = await apiFetch<{ history: NotebookHistoryItem[] }>(`/logbook/notebook/admin/history?${query.toString()}`);
  return data.history;
}

export type AdminLogbookStats = {
  totalLabs: number;
  totalInstruments: number;
  totalBookings: number;
  totalNotebookEntries: number;
  totalMembers: number;
};

export type AdminLabWorkspaceItem = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  membersCount: number;
  instrumentsCount: number;
};

export type AdminBookingItem = {
  id: string;
  instrumentId: string;
  instrumentName: string;
  instrumentCode: string;
  labId: string | null;
  labName: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  remarks: string;
  status: string;
  createdAt: string;
};

export type AdminNotebookItem = {
  id: string;
  date: string;
  userId: string;
  userName: string;
  userEmail: string;
  labId: string | null;
  labName: string;
  content: string;
  createdAt: string;
};

export async function fetchAdminLogbookOverview(params?: {
  labId?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const query = new URLSearchParams();
  if (params?.labId) query.set("labId", params.labId);
  if (params?.userId) query.set("userId", params.userId);
  if (params?.fromDate) query.set("fromDate", params.fromDate);
  if (params?.toDate) query.set("toDate", params.toDate);

  return apiFetch<{
    stats: AdminLogbookStats;
    labs: AdminLabWorkspaceItem[];
    users: { id: string; name: string | null; email: string; role: string }[];
    bookings: AdminBookingItem[];
    notebooks: AdminNotebookItem[];
    activities: LogbookActivity[];
  }>(`/logbook/admin/overview?${query.toString()}`);
}

export async function adminDeleteLabWorkspace(labId: string) {
  return apiFetch<{ success: true }>(`/logbook/admin/labs/${labId}`, {
    method: "DELETE",
  });
}

export async function adminCancelBooking(bookingId: string) {
  return apiFetch<{ success: true; booking: LogbookBooking }>(`/logbook/admin/bookings/${bookingId}`, {
    method: "DELETE",
  });
}

// ─── Stock Management API ──────────────────────────────────────────────────────

export type StockPermissions = {
  canViewStock: boolean;
  canAddStock: boolean;
  canEditStock: boolean;
  canIssueStock: boolean;
  canRestockStock: boolean;
  canManageStockSettings: boolean;
};

export type StockSettings = {
  id?: string;
  labId: string;
  lowStockThreshold: number;
  nearExpiryDays: number;
};

export type StockCategory = {
  id: string;
  labId: string;
  name: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type StockTag = {
  id: string;
  labId: string;
  name: string;
  isDefault: boolean;
  sortOrder: number;
};

export type StockLocation = {
  id: string;
  labId: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isDefault: boolean;
  parent?: StockLocation | null;
  children?: StockLocation[];
};

export type StockItem = {
  id: string;
  labId: string;
  name: string;
  casNo: string | null;
  make: string | null;
  catalogueNo: string | null;
  packSize: string | null;
  pricePaise: number;
  currentQty: number;
  expiryDate: string | null;
  categoryId: string | null;
  hazardStatus: "HAZARDOUS" | "NON_HAZARDOUS";
  storageTemperature: "AMBIENT" | "FRIDGE_2_8" | "FREEZER_MINUS_20" | "DEEP_FREEZER_MINUS_80";
  locationId: string | null;
  remarks: string | null;
  isArchived: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  // Computed
  stockValuePaise?: number;
  status?: string;
  // Relations
  category?: { id: string; name: string } | null;
  location?: { id: string; name: string; parent?: { name: string } | null } | null;
  tags?: Array<{ id: string; tag: { id: string; name: string } }>;
  transactionItems?: StockTransactionItem[];
};

export type StockTransactionItem = {
  id: string;
  transactionId: string;
  itemId: string;
  quantity: number;
  previousQty: number;
  newQty: number;
  transaction?: {
    id: string;
    type: string;
    createdAt: string;
    purpose: string | null;
    reason: string | null;
    remarks: string | null;
    createdBy: { id: string; name: string | null };
  };
};

export type StockActivityLog = {
  id: string;
  labId: string;
  userId: string;
  userName: string;
  action: string;
  itemId: string | null;
  itemName: string;
  quantityDelta: number;
  previousQty: number;
  newQty: number;
  reason: string | null;
  purpose: string | null;
  remarks: string | null;
  createdAt: string;
};

export type StockDashboardData = {
  kpis: {
    totalItems: number;
    totalStockValuePaise: number;
    totalLocations: number;
    lowStockCount: number;
    outOfStockCount: number;
    expiredCount: number;
    expiringSoonCount: number;
    expiredValuePaise: number;
    hazardousCount: number;
    nonHazardousCount: number;
  };
  charts: {
    byCategory: Array<{ name: string; count: number; valuePaise: number }>;
    byStorage: Array<{ storage: string; count: number }>;
    expiryOverview: { expired: number; days0to30: number; days31to90: number; days90plus: number };
  };
  nearExpiryItems: Array<{
    id: string; name: string; expiryDate: string;
    currentQty: number; stockValuePaise: number; location: string | null;
  }>;
  lowStockItems: Array<{ id: string; name: string; currentQty: number; lowStockThreshold: number }>;
  settings: { lowStockThreshold: number; nearExpiryDays: number };
};

// Init
export async function fetchStockInit(labId: string) {
  return apiFetch<{ settings: StockSettings; permissions: StockPermissions }>(
    `/stock/lab/${labId}/init`
  );
}

// Dashboard
export async function fetchStockDashboard(labId: string) {
  return apiFetch<StockDashboardData>(`/stock/lab/${labId}/dashboard`);
}

// Items
export async function fetchStockItems(
  labId: string,
  params: {
    search?: string; categoryId?: string; hazard?: string; storage?: string;
    locationId?: string; tagId?: string; expiryStatus?: string; availability?: string;
    sortBy?: string; sortDir?: string; page?: number; limit?: number; archived?: boolean;
  } = {}
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== false) qs.set(k, String(v));
  });
  return apiFetch<{ items: StockItem[]; total: number; page: number; limit: number; totalPages: number }>(
    `/stock/lab/${labId}/items${qs.toString() ? `?${qs}` : ""}`
  );
}

export async function createStockItem(labId: string, data: {
  name: string; casNo?: string; make?: string; catalogueNo?: string; packSize?: string;
  pricePaise: number; initialQty: number; expiryDate?: string;
  categoryId?: string; hazardStatus?: string; storageTemperature?: string;
  locationId?: string; remarks?: string; tagIds?: string[];
}) {
  return apiFetch<StockItem>(`/stock/lab/${labId}/items`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchStockItem(labId: string, itemId: string) {
  return apiFetch<StockItem>(`/stock/lab/${labId}/items/${itemId}`);
}

export async function updateStockItem(labId: string, itemId: string, data: Partial<{
  name: string; casNo: string; make: string; catalogueNo: string; packSize: string;
  pricePaise: number; expiryDate: string; categoryId: string; hazardStatus: string;
  storageTemperature: string; locationId: string; remarks: string; tagIds: string[];
}>) {
  return apiFetch<StockItem>(`/stock/lab/${labId}/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function archiveStockItem(labId: string, itemId: string, archive = true) {
  return apiFetch<StockItem>(`/stock/lab/${labId}/items/${itemId}/archive`, {
    method: "PATCH",
    body: JSON.stringify({ archive }),
  });
}

// Transactions
export async function issueStock(labId: string, data: {
  items: Array<{ itemId: string; quantity: number }>;
  purpose?: string; projectName?: string; remarks?: string;
}) {
  return apiFetch<{ transaction: { id: string } }>(`/stock/lab/${labId}/transactions/issue`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function restockItem(labId: string, data: {
  itemId: string; quantity: number; remarks?: string;
  newExpiryDate?: string; purchasePricePaise?: number; supplier?: string; invoiceNo?: string;
}) {
  return apiFetch<{ item: StockItem }>(`/stock/lab/${labId}/transactions/restock`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function stockoutItem(labId: string, data: {
  itemId: string; quantity: number; reason: string; remarks?: string;
}) {
  return apiFetch<{ item: StockItem }>(`/stock/lab/${labId}/transactions/stockout`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function adjustStock(labId: string, data: {
  itemId: string; newQty: number; reason: string; remarks?: string;
}) {
  return apiFetch<{ item: StockItem }>(`/stock/lab/${labId}/transactions/adjustment`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Activity Log
export async function fetchStockActivity(
  labId: string,
  params: { action?: string; itemId?: string; userId?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number } = {}
) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== "") qs.set(k, String(v)); });
  return apiFetch<{ logs: StockActivityLog[]; total: number; page: number; limit: number; totalPages: number }>(
    `/stock/lab/${labId}/activity${qs.toString() ? `?${qs}` : ""}`
  );
}

// Settings
export async function fetchStockSettings(labId: string) {
  return apiFetch<StockSettings>(`/stock/lab/${labId}/settings`);
}

export async function updateStockSettings(labId: string, data: Partial<{ lowStockThreshold: number; nearExpiryDays: number }>) {
  return apiFetch<StockSettings>(`/stock/lab/${labId}/settings`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Locations
export async function fetchStockLocations(labId: string) {
  return apiFetch<{ locations: StockLocation[] }>(`/stock/lab/${labId}/locations`);
}

export async function fetchStockLocationsFlat(labId: string) {
  return apiFetch<{ locations: StockLocation[] }>(`/stock/lab/${labId}/locations/flat`);
}

export async function createStockLocation(labId: string, data: { name: string; parentId?: string; sortOrder?: number }) {
  return apiFetch<StockLocation>(`/stock/lab/${labId}/locations`, {
    method: "POST", body: JSON.stringify(data),
  });
}

export async function updateStockLocation(labId: string, locationId: string, data: { name?: string; parentId?: string; sortOrder?: number }) {
  return apiFetch<StockLocation>(`/stock/lab/${labId}/locations/${locationId}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
}

export async function deleteStockLocation(labId: string, locationId: string) {
  return apiFetch<{ success: boolean }>(`/stock/lab/${labId}/locations/${locationId}`, { method: "DELETE" });
}

// Categories
export async function fetchStockCategories(labId: string) {
  return apiFetch<{ categories: StockCategory[] }>(`/stock/lab/${labId}/categories`);
}

export async function createStockCategory(labId: string, data: { name: string; sortOrder?: number }) {
  return apiFetch<StockCategory>(`/stock/lab/${labId}/categories`, {
    method: "POST", body: JSON.stringify(data),
  });
}

export async function updateStockCategory(labId: string, categoryId: string, data: { name?: string; sortOrder?: number }) {
  return apiFetch<StockCategory>(`/stock/lab/${labId}/categories/${categoryId}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
}

export async function deleteStockCategory(labId: string, categoryId: string) {
  return apiFetch<{ success: boolean }>(`/stock/lab/${labId}/categories/${categoryId}`, { method: "DELETE" });
}

// Tags
export async function fetchStockTags(labId: string) {
  return apiFetch<{ tags: StockTag[] }>(`/stock/lab/${labId}/tags`);
}

export async function createStockTag(labId: string, data: { name: string; sortOrder?: number }) {
  return apiFetch<StockTag>(`/stock/lab/${labId}/tags`, {
    method: "POST", body: JSON.stringify(data),
  });
}

export async function updateStockTag(labId: string, tagId: string, data: { name?: string; sortOrder?: number }) {
  return apiFetch<StockTag>(`/stock/lab/${labId}/tags/${tagId}`, {
    method: "PATCH", body: JSON.stringify(data),
  });
}

export async function deleteStockTag(labId: string, tagId: string) {
  return apiFetch<{ success: boolean }>(`/stock/lab/${labId}/tags/${tagId}`, { method: "DELETE" });
}

// Members
export async function fetchStockMembers(labId: string) {
  return apiFetch<{
    members: Array<{
      id: string; labId: string; userId: string; role: string;
      canViewStock: boolean; canAddStock: boolean; canEditStock: boolean;
      canIssueStock: boolean; canRestockStock: boolean; canManageStockSettings: boolean;
      user: { id: string; name: string | null; email: string; avatarUrl: string | null };
    }>
  }>(`/stock/lab/${labId}/members`);
}

export async function updateMemberStockPermissions(
  labId: string,
  memberId: string,
  data: Partial<StockPermissions>
) {
  return apiFetch<{ id: string }>(`/stock/lab/${labId}/members/${memberId}/stock-permissions`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function removeStockMember(labId: string, memberId: string) {
  return apiFetch<{ success: boolean; message: string }>(`/stock/lab/${labId}/members/${memberId}`, {
    method: "DELETE",
  });
}

export interface StockLabInvite {
  id: string;
  labId: string;
  inviterId: string;
  inviteeEmail: string;
  role: "MEMBER" | "ADMIN";
  canViewStock: boolean;
  canAddStock: boolean;
  canEditStock: boolean;
  canIssueStock: boolean;
  canRestockStock: boolean;
  canManageStockSettings: boolean;
  token: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "DECLINED";
  expiresAt: string;
  createdAt: string;
  inviter?: { name: string | null; email: string };
}

export async function addStockMemberByEmail(
  labId: string,
  payload: {
    email: string;
    role?: "MEMBER" | "ADMIN";
    permissions?: Partial<StockPermissions>;
  }
) {
  return apiFetch<{
    success: boolean;
    pending?: boolean;
    message: string;
    invite: StockLabInvite;
  }>(`/stock/lab/${labId}/members/add-by-email`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchStockLabInvites(labId: string) {
  return apiFetch<StockLabInvite[]>(`/stock/lab/${labId}/invites`);
}

export async function deleteStockLabInvite(labId: string, inviteId: string) {
  return apiFetch<{ success: boolean; message: string }>(`/stock/lab/${labId}/invites/${inviteId}`, {
    method: "DELETE",
  });
}

export async function resendStockLabInvite(labId: string, inviteId: string) {
  return apiFetch<{ success: boolean; message: string }>(`/stock/lab/${labId}/invites/${inviteId}/resend`, {
    method: "POST",
  });
}

export async function previewStockInvite(token: string) {
  return apiFetch<{
    id: string;
    labId: string;
    labName: string;
    inviterName: string;
    email: string;
    role: string;
    status: string;
    isExpired: boolean;
  }>(`/stock/invites/preview?token=${encodeURIComponent(token)}`);
}

export async function acceptStockInvite(token: string) {
  return apiFetch<{ success: boolean; labId: string; labName: string; message: string }>(`/stock/invites/accept`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

// ─── LMS Paid Sections & Access API ─────────────────────────────────────────

export type LmsSettings = {
  repoPrice: number;
  stockPrice: number;
  budgetPrice: number;
  logbookPrice: number;
  twoSectionDiscountPct: number;
  threeSectionDiscountPct: number;
  fullAccessPrice: number;
  currency: string;
  razorpayKeyId?: string | null;
  isRazorpayConfigured: boolean;
};

export type LmsUserAccess = {
  isAdmin: boolean;
  hasFullAccess: boolean;
  sections: string[];
};

export async function fetchLmsSettings() {
  return apiFetch<{ settings: LmsSettings }>("/lms/settings");
}

export async function updateLmsSettings(settings: Partial<LmsSettings>) {
  return apiFetch<{ success: boolean; settings: LmsSettings }>("/lms/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

export async function fetchLmsUserAccess() {
  return apiFetch<LmsUserAccess>("/lms/access");
}

export async function createLmsOrder(input: {
  sections: string[];
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}) {
  return apiFetch<{
    isDevMode?: boolean;
    completed?: boolean;
    orderId?: string;
    amount?: number;
    currency?: string;
    keyId?: string | null;
    paymentId: string;
    itemTitle?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    message?: string;
  }>("/lms/create-order", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function verifyLmsPayment(input: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  return apiFetch<{ success: boolean; message: string; unlockedSections: string[] }>("/lms/verify-payment", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── Admin LMS API ─────────────────────────────────────────────────────────

export async function fetchAdminLmsSettings() {
  return apiFetch<{ settings: LmsSettings }>("/admin/lms/settings");
}

export async function updateAdminLmsSettings(input: Partial<LmsSettings>) {
  return apiFetch<{ settings: LmsSettings; message: string }>("/admin/lms/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export type AdminLmsUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  lmsAccesses: Array<{
    id: string;
    section: string;
    grantedBy: string;
    createdAt: string;
  }>;
};

export async function fetchAdminLmsUsers(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return apiFetch<{ users: AdminLmsUser[] }>(`/admin/lms/users${query}`);
}

export async function grantAdminLmsAccess(input: {
  userId: string;
  section: string;
  action: "GRANT" | "REVOKE";
}) {
  return apiFetch<{ success: boolean; message: string }>("/admin/lms/grant-access", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchAdminLmsPayments() {
  return apiFetch<{
    payments: Array<{
      id: string;
      userId: string;
      amount: number;
      currency: string;
      status: string;
      lmsSections: string[];
      createdAt: string;
      completedAt: string | null;
      user: { name: string | null; email: string };
    }>;
  }>("/admin/lms/payments");
}


