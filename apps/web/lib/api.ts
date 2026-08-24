import type { AuthResponse, AuthUser } from "./auth-storage";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "/api";

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

  return response.ok;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers = new Headers(options.headers);
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
}) {
  return apiFetch<AuthResponse>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    false
  );
}

export async function loginUser(input: { email: string; password: string }) {
  return apiFetch<AuthResponse>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    false
  );
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

export type AdminStats = {
  totalUsers: number;
  emailUsers: number;
  googleUsers: number;
  recentSignups: number;
};

export type AdminUser = AuthUser & {
  authProvider: "email" | "google";
  hasPassword: boolean;
  updatedAt?: string;
};

export async function fetchAdminStats() {
  const data = await apiFetch<{ stats: AdminStats }>("/admin/stats");
  return data.stats;
}

export async function fetchAdminUsers() {
  const data = await apiFetch<{ users: AdminUser[] }>("/admin/users");
  return data.users;
}

export async function fetchAdminUser(userId: string) {
  const data = await apiFetch<{ user: AdminUser }>(`/admin/users/${userId}`);
  return data.user;
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
  createdAt: string;
  updatedAt: string;
};

export type StudyMaterial = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  files: StudyMaterialFile[];
  createdAt: string;
  updatedAt: string;
};

export async function fetchStudyMaterials() {
  const data = await apiFetch<{ materials: StudyMaterial[] }>("/materials");
  return data.materials;
}

export async function fetchStudyMaterial(id: string) {
  const data = await apiFetch<{ material: StudyMaterial }>(`/materials/${id}`);
  return data.material;
}

export async function fetchAdminStudyMaterials() {
  const data = await apiFetch<{ materials: StudyMaterial[] }>("/admin/materials");
  return data.materials;
}

export async function uploadAdminStudyMaterial(input: {
  title: string;
  description?: string;
  category?: string;
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
  }
) {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description ?? "");
  formData.append("category", input.category ?? "");

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
