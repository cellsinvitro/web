import { prisma } from "./prisma.js";
import { sendExpiryReminderEmail } from "./email.js";

export async function sendCourseReminders() {
  const now = new Date();
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: "ACTIVE",
      courseId: { not: null },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      course: { select: { id: true, title: true, reminderMode: true, reminderDaysBefore: true } },
      reminders: true,
    },
  });

  let sent = 0;

  for (const enrollment of enrollments) {
    if (!enrollment.course || enrollment.course.reminderMode !== "AUTOMATIC") continue;

    const daysRemaining = Math.ceil(
      (enrollment.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysRemaining <= 0) continue;

    const reminderDays = enrollment.course.reminderDaysBefore || [7, 3, 1];
    if (!reminderDays.includes(daysRemaining)) continue;

    const reminderType = `expiry_${daysRemaining}d`;
    const alreadySent = enrollment.reminders.some((r) => r.reminderType === reminderType);
    if (alreadySent) continue;

    const ok = await sendExpiryReminderEmail({
      to: enrollment.user.email,
      userName: enrollment.user.name || enrollment.user.email,
      courseTitle: enrollment.course.title,
      expiresAt: enrollment.expiresAt.toLocaleDateString(),
      daysRemaining,
    });

    if (ok) {
      await prisma.courseReminder.create({
        data: { enrollmentId: enrollment.id, reminderType },
      });
      sent++;
    }
  }

  return { sent, checked: enrollments.length };
}
