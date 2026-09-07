import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Designation } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { publicUserSelect, toPublicUser } from "../lib/user.js";
import { requireAuth, type AuthVariables } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

type UpdateUserBody = {
  role?: "USER" | "ADMIN";
};

export const adminRoutes = new Hono<{ Variables: AuthVariables }>();

adminRoutes.use("*", requireAuth, requireAdmin);

adminRoutes.get("/stats", async (c) => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    googleUsers,
    recentSignups,
    adminUsers,
    userDesignationsRaw,
    recentUsers,
    totalMaterials,
    totalFiles,
    fileStorageSum,
    materialCategoriesRaw,
    recentMaterials,
    totalKits,
    publishedKits,
    draftKits,
    kitCategoriesRaw,
    recentKits,
    totalCourses,
    publishedCourses,
    draftCourses,
    totalModules,
    totalPackages,
    publishedPackages,
    courseCategoriesRaw,
    recentCourses,
    totalEnrollments,
    activeEnrollments,
    completedEnrollments,
    expiredEnrollments,
    totalCertificates,
    recentEnrollments,
    recentCertificates,
    totalPayments,
    completedPayments,
    pendingPayments,
    failedPayments,
    revenueAggregate,
    recentPayments,
    recentConsultancyBookings,
  ] = await Promise.all([
    // User stats & breakdown
    prisma.user.count(),
    prisma.user.count({ where: { googleId: { not: null } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.groupBy({
      by: ["designation"],
      _count: { designation: true },
      where: { designation: { not: null } },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: adminUserSelect,
    }),

    // Material (Library) stats
    prisma.studyMaterial.count(),
    prisma.studyMaterialFile.count(),
    prisma.studyMaterialFile.aggregate({
      _sum: { fileSize: true },
    }),
    prisma.studyMaterial.groupBy({
      by: ["category"],
      _count: { category: true },
      where: { category: { not: null } },
    }),
    prisma.studyMaterial.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { files: true },
    }),

    // Kit stats
    prisma.researchKit.count(),
    prisma.researchKit.count({ where: { published: true } }),
    prisma.researchKit.count({ where: { published: false } }),
    prisma.researchKit.groupBy({
      by: ["category"],
      _count: { category: true },
    }),
    prisma.researchKit.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    }),

    // Course & Package stats
    prisma.course.count(),
    prisma.course.count({ where: { published: true } }),
    prisma.course.count({ where: { published: false } }),
    prisma.courseModule.count(),
    prisma.coursePackage.count(),
    prisma.coursePackage.count({ where: { published: true } }),
    prisma.course.groupBy({
      by: ["category"],
      _count: { category: true },
      where: { category: { not: null } },
    }),
    prisma.course.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        modules: { select: { id: true, title: true, contentType: true } },
        _count: { select: { enrollments: true } },
      },
    }),

    // Enrollment & Certificate stats
    prisma.enrollment.count(),
    prisma.enrollment.count({ where: { status: "ACTIVE" } }),
    prisma.enrollment.count({ where: { status: "COMPLETED" } }),
    prisma.enrollment.count({ where: { status: "EXPIRED" } }),
    prisma.certificate.count(),
    prisma.enrollment.findMany({
      take: 10,
      orderBy: { purchasedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        package: { select: { id: true, title: true } },
      },
    }),
    prisma.certificate.findMany({
      take: 10,
      orderBy: { issuedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
      },
    }),

    // Payment stats
    prisma.payment.count(),
    prisma.payment.count({ where: { status: "COMPLETED" } }),
    prisma.payment.count({ where: { status: "PENDING" } }),
    prisma.payment.count({ where: { status: "FAILED" } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    }),
    prisma.payment.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        course: { select: { id: true, title: true } },
        package: { select: { id: true, title: true } },
      },
    }),
    prisma.consultancyBooking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        consultant: { select: { id: true, name: true } },
      },
    }),
  ]);

  const userDesignations = userDesignationsRaw.map((item) => ({
    designation: item.designation,
    count: item._count.designation,
  }));

  const materialCategories = materialCategoriesRaw.map((item) => ({
    category: item.category,
    count: item._count.category,
  }));

  const kitCategories = kitCategoriesRaw.map((item) => ({
    category: item.category,
    count: item._count.category,
  }));

  const courseCategories = courseCategoriesRaw.map((item) => ({
    category: item.category,
    count: item._count.category,
  }));

  return c.json({
    stats: {
      // Legacy top-level mapping for backwards compatibility
      totalUsers,
      emailUsers: totalUsers - googleUsers,
      googleUsers,
      recentSignups,
      adminUsers,

      users: {
        total: totalUsers,
        email: totalUsers - googleUsers,
        google: googleUsers,
        admin: adminUsers,
        recentSignups,
      },
      materials: {
        total: totalMaterials,
        totalFiles,
        totalStorageBytes: fileStorageSum._sum.fileSize || 0,
      },
      kits: {
        total: totalKits,
        published: publishedKits,
        draft: draftKits,
      },
      courses: {
        total: totalCourses,
        published: publishedCourses,
        draft: draftCourses,
        totalModules,
      },
      packages: {
        total: totalPackages,
        published: publishedPackages,
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        completed: completedEnrollments,
        expired: expiredEnrollments,
      },
      certificates: {
        total: totalCertificates,
      },
      payments: {
        total: totalPayments,
        completed: completedPayments,
        pending: pendingPayments,
        failed: failedPayments,
        totalRevenue: revenueAggregate._sum.amount || 0,
      },
    },
    breakdowns: {
      userDesignations,
      materialCategories,
      kitCategories,
      courseCategories,
    },
    recent: {
      users: recentUsers.map(toAdminUser),
      materials: recentMaterials,
      kits: recentKits,
      courses: recentCourses,
      enrollments: recentEnrollments,
      certificates: recentCertificates,
      payments: recentPayments,
      consultancyBookings: recentConsultancyBookings,
    },
  });
});


const adminUserSelect = {
  ...publicUserSelect,
  googleId: true,
  passwordHash: true,
  updatedAt: true,
} as const;

type AdminUserRecord = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  designation: Designation | null;
  role: "USER" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
  googleId: string | null;
  passwordHash: string | null;
};

function toAdminUser(user: AdminUserRecord) {
  return {
    ...toPublicUser(user),
    authProvider: user.googleId ? ("google" as const) : ("email" as const),
    hasPassword: Boolean(user.passwordHash),
    updatedAt: user.updatedAt.toISOString(),
  };
}

adminRoutes.get("/users", async (c) => {
  const users = await prisma.user.findMany({
    select: adminUserSelect,
    orderBy: { createdAt: "desc" },
  });

  return c.json({
    users: users.map(toAdminUser),
  });
});

adminRoutes.get("/users/:id", async (c) => {
  const userId = c.req.param("id");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: adminUserSelect,
  });

  if (!user) {
    throw new HTTPException(404, { message: "User not found" });
  }

  return c.json({ user: toAdminUser(user) });
});

adminRoutes.patch("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as UpdateUserBody;
  const currentUser = c.get("user");

  if (body.role !== "USER" && body.role !== "ADMIN") {
    throw new HTTPException(400, { message: "Invalid role" });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!target) {
    throw new HTTPException(404, { message: "User not found" });
  }

  if (userId === currentUser.sub && body.role === "USER") {
    throw new HTTPException(400, {
      message: "You cannot remove your own admin access",
    });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { role: body.role },
    select: publicUserSelect,
  });

  return c.json({ user: toPublicUser(updated) });
});

adminRoutes.delete("/users/:id", async (c) => {
  const userId = c.req.param("id");
  const currentUser = c.get("user");

  if (userId === currentUser.sub) {
    throw new HTTPException(400, { message: "You cannot delete your own account" });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!target) {
    throw new HTTPException(404, { message: "User not found" });
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN" },
    });
    if (adminCount <= 1) {
      throw new HTTPException(400, {
        message: "Cannot delete the last admin account",
      });
    }
  }

  await prisma.user.delete({ where: { id: userId } });
  return c.json({ success: true });
});

adminRoutes.get("/users/:id/history", async (c) => {
  const userId = c.req.param("id");

  const [
    moduleProgress,
    liveClassAttendance,
    certificates,
    enrollments,
    kitOrderEvents,
    consultancyBookings,
    studyMaterialDownloads,
  ] = await Promise.all([
    prisma.moduleProgress.findMany({ where: { userId }, orderBy: { startedAt: "desc" } }),
    prisma.liveClassAttendance.findMany({ where: { userId }, orderBy: { joinedAt: "desc" } }),
    prisma.certificate.findMany({ where: { userId }, orderBy: { issuedAt: "desc" } }),
    prisma.enrollment.findMany({ where: { userId }, orderBy: { purchasedAt: "desc" } }),
    prisma.kitOrderEvent.findMany({ where: { actorId: userId }, orderBy: { createdAt: "desc" } }),
    prisma.consultancyBooking.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.studyMaterialDownload.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { file: { include: { material: true } } },
    }),
  ]);

  const formatHistoryItem = (item: any, type: string) => {
    switch (type) {
      case "module_progress": {
        const module = item.module;
        return {
          id: item.id,
          title: `Module: ${module?.title || "Unknown"}`,
          description: item.completed ? "Completed" : `In progress (${(item.watchProgress || 0)}%)`,
          timestamp: item.startedAt,
          type: "info",
        };
      }
      case "live_class_attendance": {
        const liveClass = item.liveClass;
        return {
          id: item.id,
          title: `Live Class: ${liveClass?.title || "Unknown"}`,
          description: item.status,
          timestamp: item.joinedAt,
          type: "info",
        };
      }
      case "certificate": {
        const course = item.course;
        return {
          id: item.id,
          title: `Certificate: ${course?.title || "Unknown"}`,
          description: "Course completed",
          timestamp: item.issuedAt,
          type: "success",
        };
      }
      case "enrollment": {
        const course = item.course;
        return {
          id: item.id,
          title: `Course Enrollment: ${course?.title || "Unknown"}`,
          description: item.status,
          timestamp: item.purchasedAt,
          type: "info",
        };
      }
      case "kit_order_event": {
        return {
          id: item.id,
          title: `Kit Order: ${item.note || "Order"}`,
          description: item.status,
          timestamp: item.createdAt,
          type: "info",
        };
      }
      case "consultancy_booking": {
        return {
          id: item.id,
          title: `Consultancy Booking`,
          description: item.consultationType,
          timestamp: item.createdAt,
          type: "info",
        };
      }
      case "study_material_download": {
        const file = item.file;
        return {
          id: item.id,
          title: `Resource downloaded: ${file?.material?.title || "Unknown"}`,
          description: file?.fileName || "Study material",
          timestamp: item.createdAt,
          type: "info",
        };
      }
      default:
        return {
          id: item.id,
          title: "Activity",
          description: "",
          timestamp: item.createdAt,
          type: "info",
        };
    }
  };

  const historyItems = [
    ...moduleProgress.map((item) => formatHistoryItem(item, "module_progress")),
    ...liveClassAttendance.map((item) => formatHistoryItem(item, "live_class_attendance")),
    ...certificates.map((item) => formatHistoryItem(item, "certificate")),
    ...enrollments.map((item) => formatHistoryItem(item, "enrollment")),
    ...kitOrderEvents.map((item) => formatHistoryItem(item, "kit_order_event")),
    ...consultancyBookings.map((item) => formatHistoryItem(item, "consultancy_booking")),
    ...studyMaterialDownloads.map((item) =>
      formatHistoryItem(item, "study_material_download")
    ),
  ];

  historyItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return c.json({ history: historyItems });
});
