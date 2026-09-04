import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  type AuthResponse,
  type AuthUser,
  type Designation,
} from "./auth-storage";

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
  published: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export async function fetchKits() {
  const response = await fetch(`${API_URL}/kits`);
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  const data = (await response.json()) as { kits: ResearchKit[] };
  return data.kits;
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
  published?: boolean;
  sortOrder?: number;
  image: File;
}) {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("category", input.category);
  formData.append("assays", JSON.stringify(input.assays));
  formData.append("published", String(input.published ?? true));
  formData.append("sortOrder", String(input.sortOrder ?? 0));
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
    published?: boolean;
    sortOrder?: number;
    image?: File;
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
  if (input.published !== undefined) {
    formData.append("published", String(input.published));
  }
  if (input.sortOrder !== undefined) {
    formData.append("sortOrder", String(input.sortOrder));
  }
  if (input.image) {
    formData.append("image", input.image);
  }

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

export async function createPaymentOrder(input: { courseId?: string; packageId?: string }) {
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

