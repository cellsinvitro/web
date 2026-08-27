import { createHash, randomBytes } from "node:crypto";
import type { Prisma } from "../generated/prisma/client.js";
import { isCloudinaryStorageKey } from "./cloudinary.js";
import { getCloudinaryImageUrl, getCloudinaryPublicId } from "./cloudinary.js";

export const courseInclude = {
  modules: { orderBy: { sortOrder: "asc" as const } },
  prerequisites: {
    include: { prerequisiteCourse: { select: { id: true, title: true } } },
  },
} satisfies Prisma.CourseInclude;

export const courseWithProgressInclude = {
  modules: { orderBy: { sortOrder: "asc" as const } },
  prerequisites: {
    include: { prerequisiteCourse: { select: { id: true, title: true } } },
  },
} satisfies Prisma.CourseInclude;

export const packageInclude = {
  items: {
    include: { course: { select: { id: true, title: true, category: true } } },
    orderBy: { courseId: "asc" as const },
  },
} satisfies Prisma.CoursePackageInclude;

export function getThumbnailUrl(thumbnailStorageKey: string | null) {
  if (!thumbnailStorageKey) return null;
  if (isCloudinaryStorageKey(thumbnailStorageKey)) {
    return getCloudinaryImageUrl(getCloudinaryPublicId(thumbnailStorageKey));
  }
  return null;
}

export function toPublicModule(module: {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  contentType: string;
  sortOrder: number;
  durationMinutes: number | null;
  isRequired: boolean;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  contentJson: unknown;
  videoWatchThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  const base = {
    id: module.id,
    courseId: module.courseId,
    title: module.title,
    description: module.description,
    contentType: module.contentType,
    sortOrder: module.sortOrder,
    durationMinutes: module.durationMinutes,
    isRequired: module.isRequired,
    hasContent: Boolean(module.fileName || module.contentJson),
    fileName: module.fileName,
    mimeType: module.mimeType,
    fileSize: module.fileSize,
    videoWatchThreshold: module.videoWatchThreshold,
    createdAt: module.createdAt.toISOString(),
    updatedAt: module.updatedAt.toISOString(),
  };

  if (module.contentType === "QUIZ") {
    const questions = parseQuizQuestions(module.contentJson).map((question) => ({
      id: question.id,
      text: question.text,
      options: question.options,
    }));
    return { ...base, contentJson: { questions } };
  }

  if (module.contentType === "ASSIGNMENT" || module.contentType === "TEXT") {
    return { ...base, contentJson: module.contentJson };
  }

  return base;
}

export function toAdminModule(module: {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  contentType: string;
  sortOrder: number;
  durationMinutes: number | null;
  isRequired: boolean;
  storageKey: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  contentJson: unknown;
  videoWatchThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    ...toPublicModule(module),
    storageKey: module.storageKey,
    contentJson: module.contentJson,
  };
}

export function toPublicCourse(
  course: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    thumbnailStorageKey: string | null;
    price: number;
    currency: string;
    accessDurationDays: number;
    passingPercentage: number;
    published: boolean;
    sortOrder: number;
    reminderMode: string;
    reminderDaysBefore: number[];
    createdAt: Date;
    updatedAt: Date;
    modules?: Array<Parameters<typeof toPublicModule>[0]>;
    prerequisites?: Array<{
      id: string;
      prerequisiteCourseId: string;
      prerequisiteCourse: { id: string; title: string };
    }>;
  },
  options?: { includeModules?: boolean }
) {
  const base = {
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category,
    thumbnailUrl: getThumbnailUrl(course.thumbnailStorageKey),
    price: course.price,
    currency: course.currency,
    accessDurationDays: course.accessDurationDays,
    passingPercentage: course.passingPercentage,
    published: course.published,
    sortOrder: course.sortOrder,
    moduleCount: course.modules?.length ?? 0,
    prerequisites: course.prerequisites?.map((p) => ({
      id: p.id,
      courseId: p.prerequisiteCourseId,
      title: p.prerequisiteCourse.title,
    })),
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  };

  if (options?.includeModules && course.modules) {
    return {
      ...base,
      modules: course.modules.map(toPublicModule),
    };
  }

  return base;
}

export function toAdminCourse(
  course: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    thumbnailStorageKey: string | null;
    price: number;
    currency: string;
    accessDurationDays: number;
    passingPercentage: number;
    published: boolean;
    sortOrder: number;
    reminderMode: string;
    reminderDaysBefore: number[];
    createdAt: Date;
    updatedAt: Date;
    modules: Array<Parameters<typeof toAdminModule>[0]>;
    prerequisites: Array<{
      id: string;
      prerequisiteCourseId: string;
      prerequisiteCourse: { id: string; title: string };
    }>;
  }
) {
  return {
    ...toPublicCourse(course),
    reminderMode: course.reminderMode,
    reminderDaysBefore: course.reminderDaysBefore,
    modules: course.modules.map(toAdminModule),
  };
}

export function toPublicPackage(pkg: {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  accessDurationDays: number;
  published: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  items?: Array<{
    id: string;
    courseId: string;
    course: { id: string; title: string; category: string | null };
  }>;
}) {
  return {
    id: pkg.id,
    title: pkg.title,
    description: pkg.description,
    price: pkg.price,
    currency: pkg.currency,
    accessDurationDays: pkg.accessDurationDays,
    published: pkg.published,
    sortOrder: pkg.sortOrder,
    courseCount: pkg.items?.length ?? 0,
    courses: pkg.items?.map((item) => ({
      id: item.course.id,
      title: item.course.title,
      category: item.course.category,
    })),
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
  };
}

export function toAdminPackage(
  pkg: {
    id: string;
    title: string;
    description: string | null;
    price: number;
    currency: string;
    accessDurationDays: number;
    published: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      courseId: string;
      course: { id: string; title: string; category: string | null };
    }>;
  }
) {
  return toPublicPackage(pkg);
}

export function calculateCourseProgress(
  modules: Array<{ id: string; isRequired: boolean }>,
  progress: Array<{ moduleId: string; completedAt: Date | null }>
) {
  const requiredModules = modules.filter((m) => m.isRequired);
  if (requiredModules.length === 0) return 100;

  const completedIds = new Set(
    progress.filter((p) => p.completedAt).map((p) => p.moduleId)
  );
  const completedRequired = requiredModules.filter((m) => completedIds.has(m.id)).length;
  return Math.round((completedRequired / requiredModules.length) * 100);
}

export function generateCertificateNumber() {
  const year = new Date().getFullYear();
  const random = randomBytes(4).toString("hex").toUpperCase();
  return `CIV-${year}-${random}`;
}

export function generateVerificationHash(
  certificateNumber: string,
  userId: string,
  courseId: string
) {
  const secret = process.env.CERTIFICATE_SECRET || "cellsinvitro-cert-secret";
  return createHash("sha256")
    .update(`${certificateNumber}:${userId}:${courseId}:${secret}`)
    .digest("hex")
    .slice(0, 32);
}

export type QuizQuestion = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
};

export function parseQuizQuestions(contentJson: unknown): QuizQuestion[] {
  if (!contentJson || typeof contentJson !== "object") return [];
  const questions = (contentJson as { questions?: QuizQuestion[] }).questions;
  return Array.isArray(questions) ? questions : [];
}

export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<string, number>
) {
  if (questions.length === 0) return { score: 0, correct: 0, total: 0 };
  let correct = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correctIndex) correct++;
  }
  const score = (correct / questions.length) * 100;
  return { score, correct, total: questions.length };
}

export async function checkPrerequisitesMet(
  userId: string,
  prerequisiteCourseIds: string[],
  prisma: {
    certificate: {
      findMany: (args: {
        where: { userId: string; courseId: { in: string[] } };
        select: { courseId: true };
      }) => Promise<Array<{ courseId: string }>>;
    };
  }
) {
  if (prerequisiteCourseIds.length === 0) return true;
  const certs = await prisma.certificate.findMany({
    where: { userId, courseId: { in: prerequisiteCourseIds } },
    select: { courseId: true },
  });
  const completedIds = new Set(certs.map((c) => c.courseId));
  return prerequisiteCourseIds.every((id) => completedIds.has(id));
}

export function getExpiryDate(accessDurationDays: number) {
  const expires = new Date();
  expires.setDate(expires.getDate() + accessDurationDays);
  return expires;
}
