const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
const EMAIL_FROM =
  process.env.EMAIL_FROM?.trim() || "CellsInVitro <certificates@cellsinvitro.com>";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3001";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function parseSender(from: string) {
  const match = /^(.+?)\s*<([^>]+)>$/.exec(from.trim());
  if (match?.[1] && match[2]) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: "CellsInVitro", email: from.trim() };
}

export function isEmailConfigured() {
  return Boolean(BREVO_API_KEY);
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!BREVO_API_KEY) {
    console.warn("[email] BREVO_API_KEY not set, skipping email to", to);
    return false;
  }

  const sender = parseSender(EMAIL_FROM);

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "api-key": BREVO_API_KEY,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[email] Brevo send failed:", text);
    return false;
  }

  return true;
}

export async function sendCertificateEmail(input: {
  to: string;
  userName: string;
  courseTitle: string;
  certificateNumber: string;
  verificationUrl: string;
}) {
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0f172a;">Congratulations, ${input.userName}!</h2>
      <p>You have successfully completed <strong>${input.courseTitle}</strong> on CellsInVitro.</p>
      <p>Your certificate number: <strong>${input.certificateNumber}</strong></p>
      <p>
        <a href="${input.verificationUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;">
          View &amp; verify certificate
        </a>
      </p>
      <p style="color:#64748b;font-size:14px;">CellsInVitro — Advancing cell culture education</p>
    </div>
  `;

  return sendEmail(
    input.to,
    `Your certificate for ${input.courseTitle}`,
    html
  );
}

export async function sendExpiryReminderEmail(input: {
  to: string;
  userName: string;
  courseTitle: string;
  expiresAt: string;
  daysRemaining: number;
}) {
  const dashboardUrl = `${FRONTEND_ORIGIN}/dashboard/courses`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #0f172a;">Course access expiring soon</h2>
      <p>Hi ${input.userName},</p>
      <p>Your access to <strong>${input.courseTitle}</strong> expires in <strong>${input.daysRemaining} day(s)</strong> (${input.expiresAt}).</p>
      <p>Continue your learning before access ends.</p>
      <p>
        <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;">
          Go to my courses
        </a>
      </p>
    </div>
  `;

  return sendEmail(
    input.to,
    `Reminder: ${input.courseTitle} access expires in ${input.daysRemaining} days`,
    html
  );
}
