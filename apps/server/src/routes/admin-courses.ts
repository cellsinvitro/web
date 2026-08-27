import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { prisma } from "../lib/prisma.js";
import {
  collectUploadedFile,
  deleteStoredCourseContent,
  storeCourseContentFile,
  storeCourseThumbnail,
  validateCourseFile,
} from "../lib/course-content.js";
import {
  courseInclude,
  packageInclude,
  toAdminCourse,
  toAdminPackage,
  toAdminModule,
  calculateCourseProgress,
  getExpiryDate,
} from "../lib/courses.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const adminCoursesRoutes = new Hono<{ Variables: AuthVariables }>();

adminCoursesRoutes.use("*", requireAuth, requireAdmin);

// --- Courses CRUD ---

adminCoursesRoutes.get("/courses", async (c) => {
  const courses = await prisma.course.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: courseInclude,
  });
  return c.json({ courses: courses.map((course) => toAdminCourse(course)) });
});

adminCoursesRoutes.post("/courses", async (c) => {
  const body = await c.req.parseBody();
  const title = String(body.title ?? "").trim();
  if (!title) throw new HTTPException(400, { message: "Title is required" });

  const thumbnailFile = collectUploadedFile(body, "thumbnail");
  let thumbnailStorageKey: string | null = null;
  if (thumbnailFile) {
    const buffer = Buffer.from(await thumbnailFile.arrayBuffer());
    thumbnailStorageKey = await storeCourseThumbnail(
      thumbnailFile.name,
      thumbnailFile.type,
      buffer
    );
  }

  const course = await prisma.course.create({
    data: {
      title,
      description: String(body.description ?? "").trim() || null,
      category: String(body.category ?? "").trim() || null,
      thumbnailStorageKey,
      price: Number(body.price) || 0,
      currency: String(body.currency ?? "INR"),
      accessDurationDays: Number(body.accessDurationDays) || 90,
      passingPercentage: Number(body.passingPercentage) || 75,
      published: String(body.published) === "true",
      sortOrder: Number(body.sortOrder) || 0,
      reminderMode: (String(body.reminderMode ?? "AUTOMATIC") as "AUTOMATIC" | "MANUAL" | "OFF"),
      reminderDaysBefore: body.reminderDaysBefore
        ? JSON.parse(String(body.reminderDaysBefore))
        : [7, 3, 1],
    },
    include: courseInclude,
  });

  return c.json({ course: toAdminCourse(course) }, 201);
});

adminCoursesRoutes.get("/courses/:id", async (c) => {
  const course = await prisma.course.findUnique({
    where: { id: c.req.param("id") },
    include: courseInclude,
  });
  if (!course) throw new HTTPException(404, { message: "Course not found" });
  return c.json({ course: toAdminCourse(course) });
});

adminCoursesRoutes.patch("/courses/:id", async (c) => {
  const courseId = c.req.param("id");
  const body = await c.req.parseBody();

  const existing = await prisma.course.findUnique({ where: { id: courseId } });
  if (!existing) throw new HTTPException(404, { message: "Course not found" });

  const thumbnailFile = collectUploadedFile(body, "thumbnail");
  let thumbnailStorageKey = existing.thumbnailStorageKey;
  if (thumbnailFile) {
    const buffer = Buffer.from(await thumbnailFile.arrayBuffer());
    if (existing.thumbnailStorageKey) {
      await deleteStoredCourseContent(existing.thumbnailStorageKey);
    }
    thumbnailStorageKey = await storeCourseThumbnail(
      thumbnailFile.name,
      thumbnailFile.type,
      buffer
    );
  }

  const course = await prisma.course.update({
    where: { id: courseId },
    data: {
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.description !== undefined
        ? { description: String(body.description).trim() || null }
        : {}),
      ...(body.category !== undefined
        ? { category: String(body.category).trim() || null }
        : {}),
      ...(body.price !== undefined ? { price: Number(body.price) } : {}),
      ...(body.currency !== undefined ? { currency: String(body.currency) } : {}),
      ...(body.accessDurationDays !== undefined
        ? { accessDurationDays: Number(body.accessDurationDays) }
        : {}),
      ...(body.passingPercentage !== undefined
        ? { passingPercentage: Number(body.passingPercentage) }
        : {}),
      ...(body.published !== undefined
        ? { published: String(body.published) === "true" }
        : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      ...(body.reminderMode !== undefined
        ? { reminderMode: String(body.reminderMode) as "AUTOMATIC" | "MANUAL" | "OFF" }
        : {}),
      ...(body.reminderDaysBefore !== undefined
        ? { reminderDaysBefore: JSON.parse(String(body.reminderDaysBefore)) }
        : {}),
      thumbnailStorageKey,
    },
    include: courseInclude,
  });

  return c.json({ course: toAdminCourse(course) });
});

adminCoursesRoutes.delete("/courses/:id", async (c) => {
  const courseId = c.req.param("id");
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { modules: true },
  });
  if (!course) throw new HTTPException(404, { message: "Course not found" });

  if (course.thumbnailStorageKey) {
    await deleteStoredCourseContent(course.thumbnailStorageKey);
  }
  for (const module of course.modules) {
    if (module.storageKey) await deleteStoredCourseContent(module.storageKey);
  }

  await prisma.course.delete({ where: { id: courseId } });
  return c.json({ success: true });
});

// --- Modules ---

adminCoursesRoutes.post("/courses/:courseId/modules", async (c) => {
  const courseId = c.req.param("courseId");
  const body = await c.req.parseBody();
  const title = String(body.title ?? "").trim();
  const contentType = String(body.contentType ?? "").trim();
  const supportedContentTypes = ["VIDEO", "PDF", "PPT", "TEXT", "IMAGE", "ASSIGNMENT", "QUIZ"] as const;

  if (!title) throw new HTTPException(400, { message: "Title is required" });
  if (!supportedContentTypes.includes(contentType as (typeof supportedContentTypes)[number])) {
    throw new HTTPException(400, { message: "Unsupported content type" });
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new HTTPException(404, { message: "Course not found" });

  const maxOrder = await prisma.courseModule.aggregate({
    where: { courseId },
    _max: { sortOrder: true },
  });

  let storageKey: string | null = null;
  let fileName: string | null = null;
  let mimeType: string | null = null;
  let fileSize: number | null = null;
  let contentJson: unknown = null;

  const file = collectUploadedFile(body, "file");
  if (file && ["VIDEO", "PDF", "PPT", "IMAGE"].includes(contentType)) {
    const validationError = validateCourseFile(file, contentType);
    if (validationError) throw new HTTPException(400, { message: validationError });
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storeCourseContentFile(file.name, file.type, buffer, contentType);
    storageKey = stored.storageKey;
    fileName = stored.fileName;
    mimeType = stored.mimeType;
    fileSize = stored.fileSize;
  }

  if (["QUIZ", "ASSIGNMENT", "TEXT"].includes(contentType) && body.contentJson) {
    contentJson = JSON.parse(String(body.contentJson));
  }

  const module = await prisma.courseModule.create({
    data: {
      courseId,
      title,
      description: String(body.description ?? "").trim() || null,
      contentType: contentType as
        | "VIDEO"
        | "PDF"
        | "PPT"
        | "TEXT"
        | "IMAGE"
        | "ASSIGNMENT"
        | "QUIZ",
      sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : (maxOrder._max.sortOrder ?? 0) + 1,
      durationMinutes: body.durationMinutes ? Number(body.durationMinutes) : null,
      isRequired: String(body.isRequired) !== "false",
      storageKey,
      fileName,
      mimeType,
      fileSize,
      contentJson: contentJson as object | undefined,
      videoWatchThreshold: body.videoWatchThreshold
        ? Number(body.videoWatchThreshold)
        : 0.95,
    },
  });

  return c.json({ module: toAdminModule(module) }, 201);
});

adminCoursesRoutes.patch("/courses/:courseId/modules/:moduleId", async (c) => {
  const { courseId, moduleId } = c.req.param();
  const body = await c.req.parseBody();

  const existing = await prisma.courseModule.findFirst({
    where: { id: moduleId, courseId },
  });
  if (!existing) throw new HTTPException(404, { message: "Module not found" });

  let storageKey = existing.storageKey;
  let fileName = existing.fileName;
  let mimeType = existing.mimeType;
  let fileSize = existing.fileSize;
  const supportedContentTypes = ["VIDEO", "PDF", "PPT", "TEXT", "IMAGE", "ASSIGNMENT", "QUIZ"] as const;
  const contentType = body.contentType ? String(body.contentType).trim() : existing.contentType;
  if (!supportedContentTypes.includes(contentType as (typeof supportedContentTypes)[number])) {
    throw new HTTPException(400, { message: "Unsupported content type" });
  }

  const file = collectUploadedFile(body, "file");
  if (file) {
    const validationError = validateCourseFile(file, contentType);
    if (validationError) throw new HTTPException(400, { message: validationError });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (existing.storageKey) await deleteStoredCourseContent(existing.storageKey);
    const stored = await storeCourseContentFile(
      file.name,
      file.type,
      buffer,
      contentType
    );
    storageKey = stored.storageKey;
    fileName = stored.fileName;
    mimeType = stored.mimeType;
    fileSize = stored.fileSize;
  }

  let contentJson = existing.contentJson;
  if (body.contentJson !== undefined) {
    contentJson = JSON.parse(String(body.contentJson)) as object;
  }

  if (contentType !== existing.contentType && !file) {
    if (existing.storageKey) await deleteStoredCourseContent(existing.storageKey);
    storageKey = null;
    fileName = null;
    mimeType = null;
    fileSize = null;
  }

  const module = await prisma.courseModule.update({
    where: { id: moduleId },
    data: {
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.description !== undefined
        ? { description: String(body.description).trim() || null }
        : {}),
      contentType: contentType as
        | "VIDEO"
        | "PDF"
        | "PPT"
        | "TEXT"
        | "IMAGE"
        | "ASSIGNMENT"
        | "QUIZ",
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
      ...(body.durationMinutes !== undefined
        ? { durationMinutes: Number(body.durationMinutes) || null }
        : {}),
      ...(body.isRequired !== undefined
        ? { isRequired: String(body.isRequired) !== "false" }
        : {}),
      ...(body.videoWatchThreshold !== undefined
        ? { videoWatchThreshold: Number(body.videoWatchThreshold) }
        : {}),
      storageKey,
      fileName,
      mimeType,
      fileSize,
      contentJson: contentJson as object | undefined,
    },
  });

  return c.json({ module: { ...module, createdAt: module.createdAt.toISOString(), updatedAt: module.updatedAt.toISOString() } });
});

adminCoursesRoutes.delete("/courses/:courseId/modules/:moduleId", async (c) => {
  const { courseId, moduleId } = c.req.param();
  const module = await prisma.courseModule.findFirst({
    where: { id: moduleId, courseId },
  });
  if (!module) throw new HTTPException(404, { message: "Module not found" });
  if (module.storageKey) await deleteStoredCourseContent(module.storageKey);
  await prisma.courseModule.delete({ where: { id: moduleId } });
  return c.json({ success: true });
});

adminCoursesRoutes.post("/courses/:courseId/modules/reorder", async (c) => {
  const courseId = c.req.param("courseId");
  const { moduleIds } = await c.req.json<{ moduleIds: string[] }>();
  if (!Array.isArray(moduleIds)) {
    throw new HTTPException(400, { message: "moduleIds array required" });
  }

  await prisma.$transaction(
    moduleIds.map((id, index) =>
      prisma.courseModule.updateMany({
        where: { id, courseId },
        data: { sortOrder: index },
      })
    )
  );

  const modules = await prisma.courseModule.findMany({
    where: { courseId },
    orderBy: { sortOrder: "asc" },
  });
  return c.json({ modules });
});

// --- Prerequisites ---

adminCoursesRoutes.post("/courses/:courseId/prerequisites", async (c) => {
  const courseId = c.req.param("courseId");
  const { prerequisiteCourseId } = await c.req.json<{ prerequisiteCourseId: string }>();

  if (!prerequisiteCourseId) {
    throw new HTTPException(400, { message: "prerequisiteCourseId required" });
  }
  if (courseId === prerequisiteCourseId) {
    throw new HTTPException(400, { message: "Course cannot be its own prerequisite" });
  }

  const prereq = await prisma.coursePrerequisite.create({
    data: { courseId, prerequisiteCourseId },
    include: { prerequisiteCourse: { select: { id: true, title: true } } },
  });

  return c.json({
    prerequisite: {
      id: prereq.id,
      courseId: prereq.prerequisiteCourseId,
      title: prereq.prerequisiteCourse.title,
    },
  }, 201);
});

adminCoursesRoutes.delete("/courses/:courseId/prerequisites/:prereqId", async (c) => {
  await prisma.coursePrerequisite.delete({ where: { id: c.req.param("prereqId") } });
  return c.json({ success: true });
});

// --- Packages ---

adminCoursesRoutes.get("/packages", async (c) => {
  const packages = await prisma.coursePackage.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: packageInclude,
  });
  return c.json({ packages: packages.map(toAdminPackage) });
});

adminCoursesRoutes.post("/packages", async (c) => {
  const body = await c.req.json();
  const title = String(body.title ?? "").trim();
  if (!title) throw new HTTPException(400, { message: "Title is required" });

  const pkg = await prisma.coursePackage.create({
    data: {
      title,
      description: body.description?.trim() || null,
      price: Number(body.price) || 0,
      currency: body.currency || "INR",
      accessDurationDays: Number(body.accessDurationDays) || 90,
      published: Boolean(body.published),
      sortOrder: Number(body.sortOrder) || 0,
      items: body.courseIds?.length
        ? {
            create: body.courseIds.map((courseId: string) => ({ courseId })),
          }
        : undefined,
    },
    include: packageInclude,
  });

  return c.json({ package: toAdminPackage(pkg) }, 201);
});

adminCoursesRoutes.patch("/packages/:id", async (c) => {
  const packageId = c.req.param("id");
  const body = await c.req.json();

  const existing = await prisma.coursePackage.findUnique({ where: { id: packageId } });
  if (!existing) throw new HTTPException(404, { message: "Package not found" });

  if (body.courseIds) {
    await prisma.coursePackageItem.deleteMany({ where: { packageId } });
    await prisma.coursePackageItem.createMany({
      data: body.courseIds.map((courseId: string) => ({ packageId, courseId })),
    });
  }

  const pkg = await prisma.coursePackage.update({
    where: { id: packageId },
    data: {
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.description !== undefined
        ? { description: body.description?.trim() || null }
        : {}),
      ...(body.price !== undefined ? { price: Number(body.price) } : {}),
      ...(body.currency !== undefined ? { currency: body.currency } : {}),
      ...(body.accessDurationDays !== undefined
        ? { accessDurationDays: Number(body.accessDurationDays) }
        : {}),
      ...(body.published !== undefined ? { published: Boolean(body.published) } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: Number(body.sortOrder) } : {}),
    },
    include: packageInclude,
  });

  return c.json({ package: toAdminPackage(pkg) });
});

adminCoursesRoutes.delete("/packages/:id", async (c) => {
  await prisma.coursePackage.delete({ where: { id: c.req.param("id") } });
  return c.json({ success: true });
});

// --- Enrollments & progress (admin view) ---

adminCoursesRoutes.get("/courses/:courseId/enrollments", async (c) => {
  const courseId = c.req.param("courseId");
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { purchasedAt: "desc" },
  });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { modules: true },
  });
  if (!course) throw new HTTPException(404, { message: "Course not found" });

  const result = await Promise.all(
    enrollments.map(async (enrollment) => {
      const progress = await prisma.moduleProgress.findMany({
        where: {
          userId: enrollment.userId,
          moduleId: { in: course.modules.map((m) => m.id) },
        },
      });
      const progressPercent = calculateCourseProgress(course.modules, progress);
      const certificate = await prisma.certificate.findUnique({
        where: { userId_courseId: { userId: enrollment.userId, courseId } },
      });
      return {
        id: enrollment.id,
        user: enrollment.user,
        status: enrollment.status,
        purchasedAt: enrollment.purchasedAt.toISOString(),
        expiresAt: enrollment.expiresAt.toISOString(),
        progressPercent,
        hasCertificate: Boolean(certificate),
        certificateNumber: certificate?.certificateNumber,
      };
    })
  );

  return c.json({ enrollments: result });
});

// --- Manual enrollment (admin grant access) ---

adminCoursesRoutes.post("/courses/:courseId/enroll", async (c) => {
  const courseId = c.req.param("courseId");
  const { userId } = await c.req.json<{ userId: string }>();
  if (!userId) throw new HTTPException(400, { message: "userId required" });

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new HTTPException(404, { message: "Course not found" });

  const existing = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  if (existing) throw new HTTPException(400, { message: "User already enrolled" });

  const payment = await prisma.payment.create({
    data: {
      userId,
      courseId,
      amount: 0,
      currency: course.currency,
      provider: "MANUAL",
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });

  const enrollment = await prisma.enrollment.create({
    data: {
      userId,
      courseId,
      status: "ACTIVE",
      expiresAt: getExpiryDate(course.accessDurationDays),
      paymentId: payment.id,
    },
  });

  return c.json({ enrollment }, 201);
});

// --- Certificates admin ---

adminCoursesRoutes.get("/certificates", async (c) => {
  const certificates = await prisma.certificate.findMany({
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return c.json({
    certificates: certificates.map((cert) => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      verificationHash: cert.verificationHash,
      issuedAt: cert.issuedAt.toISOString(),
      user: cert.user,
      course: cert.course,
    })),
  });
});

// --- Reminders ---

adminCoursesRoutes.post("/reminders/send", async (c) => {
  const { sendCourseReminders } = await import("../lib/course-reminders.js");
  const result = await sendCourseReminders();
  return c.json(result);
});
