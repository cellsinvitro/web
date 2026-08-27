import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import {
  isVideoStorageKey,
  getSignedVideoUrl,
  getVideoPublicId,
  readStoredCourseContent,
} from "../lib/course-content.js";
import { getCloudinaryImageUrl, getCloudinaryPublicId, isCloudinaryStorageKey } from "../lib/cloudinary.js";
import {
  courseInclude,
  packageInclude,
  toPublicCourse,
  toPublicPackage,
  parseQuizQuestions,
  scoreQuiz,
  calculateCourseProgress,
  generateCertificateNumber,
  generateVerificationHash,
  checkPrerequisitesMet,
} from "../lib/courses.js";
import { sendCertificateEmail } from "../lib/email.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3001";

export const coursesRoutes = new Hono<{ Variables: AuthVariables }>();

// Public catalog
coursesRoutes.get("/", async (c) => {
  const courses = await prisma.course.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      modules: { select: { id: true }, orderBy: { sortOrder: "asc" } },
      prerequisites: {
        include: { prerequisiteCourse: { select: { id: true, title: true } } },
      },
    },
  });

  const packages = await prisma.coursePackage.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: packageInclude,
  });

  return c.json({
    courses: courses.map((course) => ({
      ...toPublicCourse({ ...course, modules: undefined }),
      moduleCount: course.modules.length,
    })),
    packages: packages.map((pkg) => toPublicPackage(pkg)),
  });
});

coursesRoutes.get("/packages/:id", async (c) => {
  const pkg = await prisma.coursePackage.findFirst({
    where: { id: c.req.param("id"), published: true },
    include: packageInclude,
  });
  if (!pkg) throw new HTTPException(404, { message: "Package not found" });
  return c.json({ package: toPublicPackage(pkg) });
});

// Authenticated learner routes
coursesRoutes.get("/my/enrollments", requireAuth, async (c) => {
  const userId = c.get("user").sub;

  const enrollments = await prisma.enrollment.findMany({
    where: { userId, courseId: { not: null } },
    include: {
      course: {
        include: {
          modules: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
    orderBy: { purchasedAt: "desc" },
  });

  const now = new Date();
  const result = await Promise.all(
    enrollments.map(async (enrollment) => {
      if (!enrollment.course) return null;

      const progress = await prisma.moduleProgress.findMany({
        where: {
          userId,
          moduleId: { in: enrollment.course.modules.map((m) => m.id) },
        },
      });

      const progressPercent = calculateCourseProgress(
        enrollment.course.modules,
        progress
      );

      const certificate = await prisma.certificate.findUnique({
        where: {
          userId_courseId: { userId, courseId: enrollment.courseId! },
        },
      });

      const isExpired = enrollment.expiresAt < now && enrollment.status !== "COMPLETED";
      if (isExpired && enrollment.status === "ACTIVE") {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { status: "EXPIRED" },
        });
      }

      return {
        id: enrollment.id,
        course: toPublicCourse(enrollment.course),
        status: isExpired ? "EXPIRED" : enrollment.status,
        purchasedAt: enrollment.purchasedAt.toISOString(),
        expiresAt: enrollment.expiresAt.toISOString(),
        progressPercent,
        completedModules: progress.filter((p) => p.completedAt).length,
        totalModules: enrollment.course.modules.length,
        certificate: certificate
          ? {
              id: certificate.id,
              certificateNumber: certificate.certificateNumber,
              issuedAt: certificate.issuedAt.toISOString(),
            }
          : null,
      };
    })
  );

  return c.json({ enrollments: result.filter(Boolean) });
});

coursesRoutes.get("/my/certificates", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const certificates = await prisma.certificate.findMany({
    where: { userId },
    include: { course: { select: { id: true, title: true, category: true } } },
    orderBy: { issuedAt: "desc" },
  });

  return c.json({
    certificates: certificates.map((cert) => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      verificationHash: cert.verificationHash,
      issuedAt: cert.issuedAt.toISOString(),
      course: cert.course,
      verificationUrl: `${FRONTEND_ORIGIN}/verify/${cert.certificateNumber}`,
    })),
  });
});

coursesRoutes.get("/my/:courseId", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const courseId = c.req.param("courseId");

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (!enrollment || enrollment.status === "EXPIRED") {
    const expired =
      enrollment?.status === "EXPIRED" ||
      (enrollment?.expiresAt != null && enrollment.expiresAt < new Date());
    if (expired) throw new HTTPException(403, { message: "Course access has expired" });
    throw new HTTPException(403, { message: "Not enrolled in this course" });
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: courseInclude,
  });
  if (!course) throw new HTTPException(404, { message: "Course not found" });

  const progress = await prisma.moduleProgress.findMany({
    where: {
      userId,
      moduleId: { in: course.modules.map((m) => m.id) },
    },
  });

  const progressMap = new Map(progress.map((p) => [p.moduleId, p]));
  const progressPercent = calculateCourseProgress(course.modules, progress);

  const certificate = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  return c.json({
    course: toPublicCourse(course, { includeModules: true }),
    enrollment: {
      status: enrollment.status,
      purchasedAt: enrollment.purchasedAt.toISOString(),
      expiresAt: enrollment.expiresAt.toISOString(),
      progressPercent,
    },
    moduleProgress: course.modules.map((module) => {
      const p = progressMap.get(module.id);
      return {
        moduleId: module.id,
        completed: Boolean(p?.completedAt),
        watchProgress: p?.watchProgress ?? 0,
        quizScore: p?.quizScore,
        quizPassed: p?.quizPassed,
        assignmentSubmitted: Boolean(p?.assignmentSubmittedAt),
      };
    }),
    certificate: certificate
      ? {
          certificateNumber: certificate.certificateNumber,
          issuedAt: certificate.issuedAt.toISOString(),
        }
      : null,
  });
});

coursesRoutes.get("/my/:courseId/access", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const courseId = c.req.param("courseId");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { prerequisites: true },
  });
  if (!course) throw new HTTPException(404, { message: "Course not found" });

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  const prereqIds = course.prerequisites.map((p) => p.prerequisiteCourseId);
  const prerequisitesMet = await checkPrerequisitesMet(userId, prereqIds, prisma);

  return c.json({
    enrolled: Boolean(enrollment && enrollment.status !== "EXPIRED"),
    prerequisitesMet,
    prerequisites: course.prerequisites.map((p) => ({
      courseId: p.prerequisiteCourseId,
    })),
    locked: !prerequisitesMet,
  });
});

// Module content access
coursesRoutes.get("/my/:courseId/modules/:moduleId/content", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const { courseId, moduleId } = c.req.param();

  await assertEnrollment(userId, courseId);

  const module = await prisma.courseModule.findFirst({
    where: { id: moduleId, courseId },
  });
  if (!module) throw new HTTPException(404, { message: "Module not found" });

  if (module.contentType === "VIDEO" && module.storageKey && isVideoStorageKey(module.storageKey)) {
    const url = getSignedVideoUrl(getVideoPublicId(module.storageKey), 7200);
    return c.json({ type: "video", streamUrl: url });
  }

  if (module.contentType === "PDF" || module.contentType === "PPT") {
    if (!module.storageKey) throw new HTTPException(404, { message: "Content not available" });
    const data = await readStoredCourseContent(module.storageKey);
    return new Response(data, {
      headers: {
        "Content-Type": module.mimeType || "application/octet-stream",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (module.contentType === "IMAGE") {
    if (!module.storageKey) throw new HTTPException(404, { message: "Content not available" });
    if (isCloudinaryStorageKey(module.storageKey)) {
      return c.json({
        type: "image",
        imageUrl: getCloudinaryImageUrl(getCloudinaryPublicId(module.storageKey)),
      });
    }
    const data = await readStoredCourseContent(module.storageKey);
    return new Response(data, {
      headers: {
        "Content-Type": module.mimeType || "image/jpeg",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (module.contentType === "TEXT") {
    return c.json({
      type: "text",
      contentJson: module.contentJson,
    });
  }

  if (module.contentType === "QUIZ") {
    const questions = parseQuizQuestions(module.contentJson).map((question) => ({
      id: question.id,
      text: question.text,
      options: question.options,
    }));
    return c.json({ type: "quiz", contentJson: { questions } });
  }

  if (module.contentType === "ASSIGNMENT") {
    return c.json({
      type: "assignment",
      contentJson: module.contentJson,
    });
  }

  throw new HTTPException(404, { message: "Content not available" });
});

// Video progress tracking
coursesRoutes.post("/my/:courseId/modules/:moduleId/progress", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const { courseId, moduleId } = c.req.param();
  const body = await c.req.json<{ watchProgress?: number }>();

  await assertEnrollment(userId, courseId);

  const module = await prisma.courseModule.findFirst({
    where: { id: moduleId, courseId },
  });
  if (!module) throw new HTTPException(404, { message: "Module not found" });

  const watchProgress = Math.min(1, Math.max(0, body.watchProgress ?? 0));
  const threshold = module.videoWatchThreshold;
  const isComplete =
    module.contentType !== "VIDEO" || watchProgress >= threshold;

  const progress = await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: {
      userId,
      moduleId,
      watchProgress,
      completedAt: isComplete ? new Date() : null,
    },
    update: {
      watchProgress,
      ...(isComplete ? { completedAt: new Date() } : {}),
    },
  });

  await tryIssueCertificate(userId, courseId);

  return c.json({
    watchProgress: progress.watchProgress,
    completed: Boolean(progress.completedAt),
  });
});

// Quiz submission
coursesRoutes.post("/my/:courseId/modules/:moduleId/quiz", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const { courseId, moduleId } = c.req.param();
  const { answers } = await c.req.json<{ answers: Record<string, number> }>();

  await assertEnrollment(userId, courseId);

  const module = await prisma.courseModule.findFirst({
    where: { id: moduleId, courseId, contentType: "QUIZ" },
  });
  if (!module) throw new HTTPException(404, { message: "Quiz not found" });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new HTTPException(404, { message: "Course not found" });

  const questions = parseQuizQuestions(module.contentJson);
  const { score, correct, total } = scoreQuiz(questions, answers ?? {});
  const passed = score >= course.passingPercentage;

  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: {
      userId,
      moduleId,
      quizScore: score,
      quizPassed: passed,
      completedAt: passed ? new Date() : null,
    },
    update: {
      quizScore: score,
      quizPassed: passed,
      completedAt: passed ? new Date() : null,
    },
  });

  if (passed) await tryIssueCertificate(userId, courseId);

  return c.json({ score, correct, total, passed, passingPercentage: course.passingPercentage });
});

// Assignment submission
coursesRoutes.post("/my/:courseId/modules/:moduleId/assignment", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const { courseId, moduleId } = c.req.param();
  const { submission } = await c.req.json<{ submission: string }>();

  await assertEnrollment(userId, courseId);

  const module = await prisma.courseModule.findFirst({
    where: { id: moduleId, courseId, contentType: "ASSIGNMENT" },
  });
  if (!module) throw new HTTPException(404, { message: "Assignment not found" });

  const text = String(submission ?? "").trim();
  if (!text) throw new HTTPException(400, { message: "Submission cannot be empty" });

  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: {
      userId,
      moduleId,
      assignmentSubmission: text,
      assignmentSubmittedAt: new Date(),
      completedAt: new Date(),
    },
    update: {
      assignmentSubmission: text,
      assignmentSubmittedAt: new Date(),
      completedAt: new Date(),
    },
  });

  await tryIssueCertificate(userId, courseId);

  return c.json({ submitted: true });
});

// Mark non-video module complete (e.g. after viewing PDF)
coursesRoutes.post("/my/:courseId/modules/:moduleId/complete", requireAuth, async (c) => {
  const userId = c.get("user").sub;
  const { courseId, moduleId } = c.req.param();

  await assertEnrollment(userId, courseId);

  const module = await prisma.courseModule.findFirst({
    where: { id: moduleId, courseId },
  });
  if (!module) throw new HTTPException(404, { message: "Module not found" });

  if (module.contentType === "VIDEO") {
    throw new HTTPException(400, { message: "Video modules complete via watch progress" });
  }
  if (module.contentType === "QUIZ") {
    throw new HTTPException(400, { message: "Quiz modules complete by passing the test" });
  }
  if (module.contentType === "ASSIGNMENT") {
    throw new HTTPException(400, { message: "Assignment modules complete by submitting" });
  }

  await prisma.moduleProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    create: { userId, moduleId, completedAt: new Date() },
    update: { completedAt: new Date() },
  });

  await tryIssueCertificate(userId, courseId);

  return c.json({ completed: true });
});

coursesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  if (id === "my" || id === "packages") {
    throw new HTTPException(404, { message: "Not found" });
  }
  const course = await prisma.course.findFirst({
    where: { id, published: true },
    include: courseInclude,
  });
  if (!course) throw new HTTPException(404, { message: "Course not found" });
  return c.json({
    course: toPublicCourse(course, { includeModules: true }),
  });
});

async function assertEnrollment(userId: string, courseId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });

  if (!enrollment) {
    throw new HTTPException(403, { message: "Not enrolled in this course" });
  }

  if (enrollment.expiresAt < new Date() && enrollment.status !== "COMPLETED") {
    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { status: "EXPIRED" },
    });
    throw new HTTPException(403, { message: "Course access has expired" });
  }
}

async function tryIssueCertificate(userId: string, courseId: string) {
  const existing = await prisma.certificate.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) return;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { modules: true },
  });
  if (!course) return;

  const progress = await prisma.moduleProgress.findMany({
    where: {
      userId,
      moduleId: { in: course.modules.map((m) => m.id) },
      completedAt: { not: null },
    },
  });

  const requiredModules = course.modules.filter((m) => m.isRequired);
  const completedIds = new Set(progress.map((p) => p.moduleId));
  const allRequiredComplete = requiredModules.every((m) => completedIds.has(m.id));

  if (!allRequiredComplete) return;

  const certificateNumber = generateCertificateNumber();
  const verificationHash = generateVerificationHash(certificateNumber, userId, courseId);

  const certificate = await prisma.certificate.create({
    data: {
      userId,
      courseId,
      certificateNumber,
      verificationHash,
    },
  });

  await prisma.enrollment.updateMany({
    where: { userId, courseId },
    data: { status: "COMPLETED" },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    const verificationUrl = `${FRONTEND_ORIGIN}/verify/${certificate.certificateNumber}`;
    await sendCertificateEmail({
      to: user.email,
      userName: user.name || user.email,
      courseTitle: course.title,
      certificateNumber: certificate.certificateNumber,
      verificationUrl,
    });
  }
}

// Public certificate verification
export const certificateRoutes = new Hono();

certificateRoutes.get("/:certificateNumber", async (c) => {
  const certificate = await prisma.certificate.findUnique({
    where: { certificateNumber: c.req.param("certificateNumber") },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true, category: true } },
    },
  });

  if (!certificate) {
    throw new HTTPException(404, { message: "Certificate not found" });
  }

  return c.json({
    valid: true,
    certificateNumber: certificate.certificateNumber,
    verificationHash: certificate.verificationHash,
    issuedAt: certificate.issuedAt.toISOString(),
    recipientName: certificate.user.name || "Learner",
    courseTitle: certificate.course.title,
    courseCategory: certificate.course.category,
  });
});
