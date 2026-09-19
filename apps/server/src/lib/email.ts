import { prisma } from "./prisma.js";
import { generateKitOrderInvoicePdf, type KitOrderInvoiceData } from "./pdf.js";

const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
const EMAIL_FROM =
  process.env.EMAIL_FROM?.trim() || "CellsInVitro <cellsinvitro.w@gmail.com>";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3001";
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();

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

export interface EmailAttachment {
  name: string;
  content: string; // base64 encoded string
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  attachments?: EmailAttachment[]
) {
  if (!BREVO_API_KEY) {
    console.warn("[email] BREVO_API_KEY is not configured in .env, skipping email to", to);
    return false;
  }

  const sender = parseSender(EMAIL_FROM);

  try {
    const bodyPayload: Record<string, unknown> = {
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    };

    if (attachments && attachments.length > 0) {
      bodyPayload.attachment = attachments;
    }

    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("[email] Brevo SMTP API send failed:", text);
      if (response.status === 401) {
        console.error(
          "[email] 401 Unauthorized: Please ensure BREVO_API_KEY in apps/server/.env is a Brevo API key (from Brevo Dashboard > SMTP & API > API Keys) and the sender email is verified in Brevo."
        );
      }
      return false;
    }

    console.log("[email] Brevo email delivered successfully to:", to);
    return true;
  } catch (err) {
    console.error("[email] Brevo request error:", err);
    return false;
  }
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

export async function sendOtpEmail(input: {
  to: string;
  code: string;
  purpose?: string;
}) {
  const purposeTitle = input.purpose === "REGISTRATION" ? "Account Registration" : "Sign In";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="margin-bottom: 24px; text-align: center;">
        <h1 style="font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">CellsInVitro</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0;">Verification Code for ${purposeTitle}</p>
      </div>
      <div style="background-color: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0;">Use the following One-Time Password (OTP) code:</p>
        <div style="font-family: monospace, Courier, sans-serif; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0f172a; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 12px 24px; display: inline-block;">
          ${input.code}
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin: 16px 0 0 0;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">If you did not request this verification code, please ignore this email.</p>
    </div>
  `;

  if (!BREVO_API_KEY) {
    console.log(`[email dev fallback] BREVO_API_KEY is not set. OTP code for ${input.to} is: ${input.code}`);
  }

  return sendEmail(
    input.to,
    `${input.code} is your CellsInVitro verification code`,
    html
  );
}

export async function sendKitOrderConfirmationEmail(input: {
  to: string;
  customerName: string;
  orderId: string;
  itemTitle: string;
  quantity: number;
  amount: number;
  currency: string;
  shippingAddress: string;
  pdfBuffer: Buffer;
}) {
  const formattedAmount = `${input.currency} ${input.amount.toFixed(2)}`;
  const orderDetailsUrl = `${FRONTEND_ORIGIN}/dashboard/kits`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 8px 0;">CellsInVitro</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">Order Confirmation &amp; Receipt</p>
      </div>

      <div style="padding: 32px 24px;">
        <h2 style="color: #0f172a; font-size: 20px; margin-top: 0;">Thank you for your order, ${input.customerName}!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          We have received your kit order and are processing it for shipment. A PDF copy of your tax invoice is attached to this email.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Order Reference:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f172a; text-align: right;">${input.orderId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Research Kit:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.itemTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Quantity:</td>
              <td style="padding: 6px 0; text-align: right;">${input.quantity}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Total Paid:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #2563eb; text-align: right;">${formattedAmount}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 8px 0; color: #0f172a; font-size: 14px;">Shipping Destination</h4>
          <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.5; whitespace: pre-line;">${input.shippingAddress}</p>
        </div>

        <div style="text-align: center; margin: 32px 0 16px 0;">
          <a href="${orderDetailsUrl}" style="display: inline-block; padding: 12px 28px; background-color: #0f172a; color: #ffffff; font-weight: 600; text-decoration: none; border-radius: 8px; font-size: 14px;">
            Track Order Status
          </a>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 20px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        <p style="margin: 0;">CellsInVitro &bull; Advancing Cell Culture Education &amp; Research</p>
      </div>
    </div>
  `;

  const pdfBase64 = input.pdfBuffer.toString("base64");
  const invoiceFileName = `Invoice-${input.orderId.slice(-8).toUpperCase()}.pdf`;

  return sendEmail(
    input.to,
    `Order Confirmation: ${input.itemTitle} (#${input.orderId.slice(-8).toUpperCase()})`,
    html,
    [{ name: invoiceFileName, content: pdfBase64 }]
  );
}

export async function sendKitOrderAdminNotificationEmail(input: {
  to: string;
  adminName?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  orderId: string;
  itemTitle: string;
  quantity: number;
  amount: number;
  currency: string;
  provider?: string | null;
}) {
  const formattedAmount = `${input.currency} ${input.amount.toFixed(2)}`;
  const adminDashboardUrl = `${FRONTEND_ORIGIN}/admin/orders`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #2563eb; padding: 28px 24px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 4px 0;">New Order Notification</h1>
        <p style="color: #dbeafe; font-size: 14px; margin: 0;">A new kit order requires fulfillment</p>
      </div>

      <div style="padding: 28px 24px;">
        <p style="color: #334155; font-size: 15px; margin-top: 0;">
          Hi ${input.adminName || "Admin"}, a new research kit order has been placed and confirmed.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <h3 style="margin: 0 0 12px 0; font-size: 15px; color: #0f172a;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Order ID:</td>
              <td style="padding: 4px 0; font-weight: 700; color: #0f172a; text-align: right;">${input.orderId}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Kit Purchased:</td>
              <td style="padding: 4px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.itemTitle}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Quantity:</td>
              <td style="padding: 4px 0; text-align: right;">${input.quantity}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Amount Paid:</td>
              <td style="padding: 4px 0; font-weight: 700; color: #16a34a; text-align: right;">${formattedAmount}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Payment Provider:</td>
              <td style="padding: 4px 0; text-align: right;">${input.provider || "RAZORPAY"}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #0f172a;">Customer &amp; Delivery Details</h3>
          <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Name:</strong> ${input.customerName}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Email:</strong> ${input.customerEmail}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Phone:</strong> ${input.customerPhone}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #1e293b; line-height: 1.5; whitespace: pre-line;"><strong>Shipping Address:</strong><br />${input.shippingAddress}</p>
        </div>

        <div style="text-align: center; margin: 28px 0 12px 0;">
          <a href="${adminDashboardUrl}" style="display: inline-block; padding: 12px 28px; background-color: #2563eb; color: #ffffff; font-weight: 600; text-decoration: none; border-radius: 8px; font-size: 14px;">
            Open Admin Orders Dashboard
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `[NEW ORDER] ${input.itemTitle} by ${input.customerName} (#${input.orderId.slice(-8).toUpperCase()})`,
    html
  );
}

export async function sendCryoInviteEmail(input: {
  to: string;
  ownerName: string;
  itemPath: string[];
  itemType: string;
  acceptUrl: string;
}) {
  const breadcrumb = input.itemPath.join(" &rsaquo; ");
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #db2777 0%, #9d174d 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.3px;">CryoSearch Invitation</h1>
        <p style="color: #fce7f3; font-size: 14px; margin: 0;">You have been invited to access a shared repository item</p>
      </div>

      <!-- Body -->
      <div style="padding: 32px 28px;">
        <p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
          <strong>${input.ownerName}</strong> has invited you to access their CryoSearch repository.
        </p>

        <!-- Item card -->
        <div style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; padding: 18px 20px; margin-bottom: 28px;">
          <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #9d174d; text-transform: uppercase; letter-spacing: 0.6px;">${input.itemType}</p>
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1e293b;">${breadcrumb}</p>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin: 28px 0 24px 0;">
          <a href="${input.acceptUrl}"
             style="display: inline-block; padding: 14px 36px; background-color: #db2777; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 10px; letter-spacing: -0.2px;">
            Accept Access &rarr;
          </a>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center; line-height: 1.5; margin: 0;">
          This invite link expires in <strong>72 hours</strong>. If you were not expecting this invitation, you can safely ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        CellsInVitro &bull; CryoSearch Repository &bull; Advancing Cell Culture Research
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `${input.ownerName} invited you to access a CryoSearch repository item`,
    html
  );
}

// ─── Logbook Lab Invite ───────────────────────────────────────────────────────

export async function sendLogbookInviteEmail(input: {
  to: string;
  inviterName: string;
  labName: string;
  acceptUrl: string;
}) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.3px;">Lab Logbook Invitation</h1>
        <p style="color: #cbd5e1; font-size: 14px; margin: 0;">You have been invited to join a laboratory workspace</p>
      </div>

      <!-- Body -->
      <div style="padding: 32px 28px;">
        <p style="color: #1e293b; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
          <strong>${input.inviterName}</strong> has invited you to join their lab workspace on CellsInVitro.
        </p>

        <!-- Lab card -->
        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 12px; padding: 18px 20px; margin-bottom: 28px;">
          <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.6px;">Lab Workspace</p>
          <p style="margin: 0; font-size: 16px; font-weight: 600; color: #0f172a;">${input.labName}</p>
        </div>

        <!-- CTA -->
        <div style="text-align: center; margin: 28px 0 24px 0;">
          <a href="${input.acceptUrl}"
             style="display: inline-block; padding: 14px 36px; background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 10px; letter-spacing: -0.2px;">
            Accept Invitation &rarr;
          </a>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center; line-height: 1.5; margin: 0;">
          This invite link expires in <strong>7 days</strong>. If you were not expecting this invitation, you can safely ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        CellsInVitro &bull; Lab Logbook &bull; Advancing Cell Culture Research
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `${input.inviterName} invited you to join ${input.labName} on CellsInVitro`,
    html
  );
}

export async function notifyKitOrderCreated(paymentId: string) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        kit: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!payment || !payment.kitId) {
      console.warn(`[email] notifyKitOrderCreated skipped: payment ${paymentId} is not a valid kit order`);
      return;
    }

    const customerName = payment.customerName || payment.user?.name || "Customer";
    const customerEmail = payment.customerEmail || payment.user?.email;
    const customerPhone = payment.customerPhone || "N/A";
    const shippingAddress = payment.shippingAddress || "N/A";
    const itemTitle = payment.itemTitle || payment.kit?.title || "Research Kit";

    // 1. Generate PDF Invoice
    const invoiceData: KitOrderInvoiceData = {
      id: payment.id,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt,
      amount: payment.amount,
      currency: payment.currency,
      quantity: payment.quantity,
      itemTitle,
      unitAmount: payment.unitAmount,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
    };

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateKitOrderInvoicePdf(invoiceData);
    } catch (pdfErr) {
      console.error("[email] Failed to generate PDF invoice for order:", paymentId, pdfErr);
      return;
    }

    // 2. Send Customer Confirmation Email with PDF Invoice attached
    if (customerEmail) {
      await sendKitOrderConfirmationEmail({
        to: customerEmail,
        customerName,
        orderId: payment.id,
        itemTitle,
        quantity: payment.quantity,
        amount: payment.amount,
        currency: payment.currency,
        shippingAddress,
        pdfBuffer,
      });
    } else {
      console.warn("[email] Customer email missing for order notification:", paymentId);
    }

    // 3. Find and Notify Admins
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { email: true, name: true },
    });

    const adminEmails = new Set<string>();
    for (const admin of adminUsers) {
      if (admin.email) adminEmails.add(admin.email.trim().toLowerCase());
    }
    if (ADMIN_NOTIFICATION_EMAIL) {
      adminEmails.add(ADMIN_NOTIFICATION_EMAIL.toLowerCase());
    }

    for (const adminEmail of adminEmails) {
      await sendKitOrderAdminNotificationEmail({
        to: adminEmail,
        customerName,
        customerEmail: customerEmail || "N/A",
        customerPhone,
        shippingAddress,
        orderId: payment.id,
        itemTitle,
        quantity: payment.quantity,
        amount: payment.amount,
        currency: payment.currency,
        provider: payment.provider,
      });
    }
  } catch (err) {
    console.error("[email] Error in notifyKitOrderCreated:", err);
  }
}

// ─── Helper: collect all admin emails (DB admins + env var) ─────────────────

async function collectAdminEmails(): Promise<Set<string>> {
  const adminUsers = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { email: true },
  });

  const emails = new Set<string>();
  for (const admin of adminUsers) {
    if (admin.email) emails.add(admin.email.trim().toLowerCase());
  }
  if (ADMIN_NOTIFICATION_EMAIL) {
    emails.add(ADMIN_NOTIFICATION_EMAIL.toLowerCase());
  }
  return emails;
}

// ─── Welcome / Registration ──────────────────────────────────────────────────

export async function sendWelcomeEmail(input: {
  to: string;
  userName: string;
  isGoogleSignup?: boolean;
}) {
  const dashboardUrl = `${FRONTEND_ORIGIN}/dashboard`;
  const displayName = input.userName || "there";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 32px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 26px; font-weight: 800; margin: 0 0 6px 0; letter-spacing: -0.3px;">Welcome to CellsInVitro</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">Advancing Cell Culture Education &amp; Research</p>
      </div>

      <div style="padding: 32px 28px;">
        <h2 style="font-size: 20px; color: #0f172a; margin: 0 0 12px 0;">Hi ${displayName}, your account is ready!</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          You have successfully registered on CellsInVitro${input.isGoogleSignup ? " via Google" : ""}. Explore our courses, live sessions, research kits, and resource library — all designed to advance your cell culture skills.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #0f172a; font-weight: 600;">What you can do next:</p>
          <ul style="margin: 0; padding-left: 18px; color: #475569; font-size: 14px; line-height: 2;">
            <li>Browse and enrol in courses</li>
            <li>Book live sessions &amp; expert consultations</li>
            <li>Order research kits delivered to your door</li>
            <li>Access the study material library</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 0 0 8px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 13px 32px; background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 10px;">
            Go to My Dashboard &rarr;
          </a>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        CellsInVitro &bull; Advancing Cell Culture Education &amp; Research
      </div>
    </div>
  `;

  return sendEmail(input.to, "Welcome to CellsInVitro — your account is ready!", html);
}

export async function sendWelcomeAdminNotificationEmail(input: {
  to: string;
  newUserName: string;
  newUserEmail: string;
  signupMethod: "email" | "google" | "otp";
}) {
  const adminDashboardUrl = `${FRONTEND_ORIGIN}/admin/users`;
  const methodLabel =
    input.signupMethod === "google"
      ? "Google OAuth"
      : input.signupMethod === "otp"
      ? "Email OTP (passwordless)"
      : "Email &amp; Password";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 24px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 20px; font-weight: 800; margin: 0 0 4px 0;">New User Registration</h1>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">A new account has been created on CellsInVitro</p>
      </div>

      <div style="padding: 28px;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 5px 0; color: #64748b; width: 40%;">Name:</td>
              <td style="padding: 5px 0; font-weight: 600; color: #0f172a;">${input.newUserName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Email:</td>
              <td style="padding: 5px 0; color: #0f172a;">${input.newUserEmail}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Sign-up Method:</td>
              <td style="padding: 5px 0; color: #0f172a;">${methodLabel}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Registered At:</td>
              <td style="padding: 5px 0; color: #0f172a;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center;">
          <a href="${adminDashboardUrl}" style="display: inline-block; padding: 11px 28px; background-color: #0f172a; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px;">
            View in Admin Dashboard
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `[NEW USER] ${input.newUserName} (${input.newUserEmail}) just registered`,
    html
  );
}

export async function notifyNewUserRegistered(input: {
  userId: string;
  userName: string;
  userEmail: string;
  signupMethod: "email" | "google" | "otp";
}) {
  try {
    // 1. Welcome email to the new user
    await sendWelcomeEmail({
      to: input.userEmail,
      userName: input.userName,
      isGoogleSignup: input.signupMethod === "google",
    });

    // 2. Admin notification
    const adminEmails = await collectAdminEmails();
    for (const adminEmail of adminEmails) {
      await sendWelcomeAdminNotificationEmail({
        to: adminEmail,
        newUserName: input.userName,
        newUserEmail: input.userEmail,
        signupMethod: input.signupMethod,
      });
    }
  } catch (err) {
    console.error("[email] Error in notifyNewUserRegistered:", err);
  }
}

// ─── Course / Package Enrollment ─────────────────────────────────────────────

export async function sendCourseEnrollmentConfirmationEmail(input: {
  to: string;
  userName: string;
  courseTitle: string;
  enrollmentId: string;
  expiresAt: string;
  amount: number;
  currency: string;
  isFree: boolean;
  packageTitle?: string;
}) {
  const dashboardUrl = `${FRONTEND_ORIGIN}/dashboard/courses`;
  const formattedAmount = input.isFree
    ? "Free"
    : `${input.currency} ${(input.amount / 100).toFixed(2)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 32px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 6px 0;">Enrolment Confirmed!</h1>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">You now have access to your course</p>
      </div>

      <div style="padding: 32px 28px;">
        <h2 style="font-size: 18px; color: #0f172a; margin: 0 0 16px 0;">Hi ${input.userName},</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Your enrolment in <strong>${input.courseTitle}</strong>${input.packageTitle ? ` (part of the <strong>${input.packageTitle}</strong> package)` : ""} has been confirmed. You can start learning immediately.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Course:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.courseTitle}</td>
            </tr>
            ${
              input.packageTitle
                ? `<tr>
              <td style="padding: 6px 0; color: #64748b;">Package:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${input.packageTitle}</td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Enrolment ID:</td>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b; text-align: right;">${input.enrollmentId.slice(-12).toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Access Until:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.expiresAt}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Amount Paid:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #2563eb; text-align: right;">${formattedAmount}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 0 0 8px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 13px 32px; background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 10px;">
            Start Learning &rarr;
          </a>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        CellsInVitro &bull; Advancing Cell Culture Education &amp; Research
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `Enrolment Confirmed: ${input.courseTitle}`,
    html
  );
}

export async function sendCourseEnrollmentAdminNotificationEmail(input: {
  to: string;
  userName: string;
  userEmail: string;
  courseTitle: string;
  enrollmentId: string;
  expiresAt: string;
  amount: number;
  currency: string;
  isFree: boolean;
  packageTitle?: string;
}) {
  const adminDashboardUrl = `${FRONTEND_ORIGIN}/admin/enrollments`;
  const formattedAmount = input.isFree
    ? "Free"
    : `${input.currency} ${(input.amount / 100).toFixed(2)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background-color: #16a34a; padding: 24px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 20px; font-weight: 800; margin: 0 0 4px 0;">New Course Enrolment</h1>
        <p style="color: #bbf7d0; font-size: 13px; margin: 0;">A student has enrolled in a course</p>
      </div>

      <div style="padding: 28px;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #0f172a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Student</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 4px 0; color: #64748b; width: 35%;">Name:</td><td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${input.userName}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Email:</td><td style="padding: 4px 0; color: #0f172a;">${input.userEmail}</td></tr>
          </table>
        </div>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 14px; color: #0f172a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Enrolment Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 4px 0; color: #64748b; width: 40%;">Course:</td><td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${input.courseTitle}</td></tr>
            ${input.packageTitle ? `<tr><td style="padding: 4px 0; color: #64748b;">Package:</td><td style="padding: 4px 0; color: #0f172a;">${input.packageTitle}</td></tr>` : ""}
            <tr><td style="padding: 4px 0; color: #64748b;">Amount:</td><td style="padding: 4px 0; font-weight: 700; color: #16a34a;">${formattedAmount}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Access Until:</td><td style="padding: 4px 0; color: #0f172a;">${input.expiresAt}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Enrolment ID:</td><td style="padding: 4px 0; font-size: 12px; color: #64748b;">${input.enrollmentId.slice(-12).toUpperCase()}</td></tr>
          </table>
        </div>

        <div style="text-align: center;">
          <a href="${adminDashboardUrl}" style="display: inline-block; padding: 11px 28px; background-color: #16a34a; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px;">
            View Enrolments
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `[NEW ENROLMENT] ${input.userName} enrolled in ${input.courseTitle}`,
    html
  );
}

export async function notifyCourseEnrollment(input: {
  userId: string;
  enrollmentId: string;
  courseTitle: string;
  expiresAt: Date;
  amount: number;
  currency: string;
  packageTitle?: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true, email: true },
    });
    if (!user?.email) return;

    const userName: string = user.name || user.email.split("@")[0] || user.email;
    const isFree = input.amount === 0;
    const expiresAtFormatted = input.expiresAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    // 1. Confirmation to user
    await sendCourseEnrollmentConfirmationEmail({
      to: user.email,
      userName,
      courseTitle: input.courseTitle,
      enrollmentId: input.enrollmentId,
      expiresAt: expiresAtFormatted,
      amount: input.amount,
      currency: input.currency,
      isFree,
      packageTitle: input.packageTitle,
    });

    // 2. Admin notification
    const adminEmails = await collectAdminEmails();
    for (const adminEmail of adminEmails) {
      await sendCourseEnrollmentAdminNotificationEmail({
        to: adminEmail,
        userName,
        userEmail: user.email,
        courseTitle: input.courseTitle,
        enrollmentId: input.enrollmentId,
        expiresAt: expiresAtFormatted,
        amount: input.amount,
        currency: input.currency,
        isFree,
        packageTitle: input.packageTitle,
      });
    }
  } catch (err) {
    console.error("[email] Error in notifyCourseEnrollment:", err);
  }
}

// ─── Live Class Booking ───────────────────────────────────────────────────────

export async function sendLiveClassBookingConfirmationEmail(input: {
  to: string;
  userName: string;
  classTitle: string;
  scheduledAt: string;
  startTime: string;
  duration: number;
  amount: number;
  currency: string;
  isFree: boolean;
  liveClassId: string;
}) {
  const dashboardUrl = `${FRONTEND_ORIGIN}/dashboard/live-classes`;
  const formattedAmount = input.isFree
    ? "Free"
    : `${input.currency} ${(input.amount / 100).toFixed(2)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 6px 0;">Live Session Booking Confirmed!</h1>
        <p style="color: #ddd6fe; font-size: 14px; margin: 0;">Your seat is reserved</p>
      </div>

      <div style="padding: 32px 28px;">
        <h2 style="font-size: 18px; color: #0f172a; margin: 0 0 16px 0;">Hi ${input.userName},</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Your booking for the live session <strong>${input.classTitle}</strong> has been confirmed. Join before the session starts to ensure a smooth entry.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Session:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.classTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Date:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.scheduledAt}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Start Time:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.startTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Duration:</td>
              <td style="padding: 6px 0; text-align: right;">${input.duration} minutes</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Booking ID:</td>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b; text-align: right;">${input.liveClassId.slice(-10).toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Amount Paid:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #7c3aed; text-align: right;">${formattedAmount}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 0 0 8px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 13px 32px; background-color: #7c3aed; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 10px;">
            View My Live Sessions &rarr;
          </a>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        CellsInVitro &bull; Advancing Cell Culture Education &amp; Research
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `Live Session Booked: ${input.classTitle}`,
    html
  );
}

export async function sendLiveClassBookingAdminNotificationEmail(input: {
  to: string;
  userName: string;
  userEmail: string;
  classTitle: string;
  scheduledAt: string;
  startTime: string;
  duration: number;
  amount: number;
  currency: string;
  isFree: boolean;
  liveClassId: string;
}) {
  const adminDashboardUrl = `${FRONTEND_ORIGIN}/admin/live-classes`;
  const formattedAmount = input.isFree
    ? "Free"
    : `${input.currency} ${(input.amount / 100).toFixed(2)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 24px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 20px; font-weight: 800; margin: 0 0 4px 0;">New Live Session Booking</h1>
        <p style="color: #ddd6fe; font-size: 13px; margin: 0;">A student has booked a live session</p>
      </div>

      <div style="padding: 28px;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Student</h3>
          <p style="margin: 2px 0; font-size: 14px; color: #0f172a;"><strong>${input.userName}</strong> &bull; ${input.userEmail}</p>
        </div>

        <div style="background-color: #faf5ff; border: 1px solid #e9d5ff; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; color: #7c3aed; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 4px 0; color: #64748b; width: 40%;">Session:</td><td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${input.classTitle}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Date:</td><td style="padding: 4px 0; color: #0f172a;">${input.scheduledAt}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Time:</td><td style="padding: 4px 0; color: #0f172a;">${input.startTime}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Duration:</td><td style="padding: 4px 0; color: #0f172a;">${input.duration} min</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Amount:</td><td style="padding: 4px 0; font-weight: 700; color: #7c3aed;">${formattedAmount}</td></tr>
          </table>
        </div>

        <div style="text-align: center;">
          <a href="${adminDashboardUrl}" style="display: inline-block; padding: 11px 28px; background-color: #7c3aed; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px;">
            View Live Classes
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `[LIVE BOOKING] ${input.userName} booked "${input.classTitle}"`,
    html
  );
}

export async function notifyLiveClassBooking(input: {
  userId: string;
  liveClassId: string;
  classTitle: string;
  scheduledAt: Date;
  startTime: string;
  duration: number;
  amount: number;
  currency: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true, email: true },
    });
    if (!user?.email) return;

    const userName: string = user.name || user.email.split("@")[0] || user.email;
    const isFree = input.amount === 0;
    const scheduledAtFormatted = input.scheduledAt.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    // 1. Confirmation to user
    await sendLiveClassBookingConfirmationEmail({
      to: user.email,
      userName,
      classTitle: input.classTitle,
      scheduledAt: scheduledAtFormatted,
      startTime: input.startTime,
      duration: input.duration,
      amount: input.amount,
      currency: input.currency,
      isFree,
      liveClassId: input.liveClassId,
    });

    // 2. Admin notification
    const adminEmails = await collectAdminEmails();
    for (const adminEmail of adminEmails) {
      await sendLiveClassBookingAdminNotificationEmail({
        to: adminEmail,
        userName,
        userEmail: user.email,
        classTitle: input.classTitle,
        scheduledAt: scheduledAtFormatted,
        startTime: input.startTime,
        duration: input.duration,
        amount: input.amount,
        currency: input.currency,
        isFree,
        liveClassId: input.liveClassId,
      });
    }
  } catch (err) {
    console.error("[email] Error in notifyLiveClassBooking:", err);
  }
}

// ─── Consultancy Booking ──────────────────────────────────────────────────────

export async function sendConsultancyBookingConfirmationEmail(input: {
  to: string;
  userName: string;
  consultantName: string;
  consultationType: string;
  date: string;
  startTime: string;
  endTime: string;
  amount: number;
  currency: string;
  bookingId: string;
}) {
  const dashboardUrl = `${FRONTEND_ORIGIN}/dashboard/consultancy`;
  const formattedAmount = `${input.currency} ${(input.amount / 100).toFixed(2)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 6px 0;">Consultation Booking Confirmed!</h1>
        <p style="color: #a5f3fc; font-size: 14px; margin: 0;">Your session with ${input.consultantName} is booked</p>
      </div>

      <div style="padding: 32px 28px;">
        <h2 style="font-size: 18px; color: #0f172a; margin: 0 0 16px 0;">Hi ${input.userName},</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          Your consultation with <strong>${input.consultantName}</strong> has been confirmed. Please be ready a few minutes before the session starts.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Consultant:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.consultantName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Consultation Type:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${input.consultationType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Date:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.date}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Time:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.startTime} – ${input.endTime}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Booking ID:</td>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b; text-align: right;">${input.bookingId.slice(-10).toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Amount Paid:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0891b2; text-align: right;">${formattedAmount}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 0 0 8px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 13px 32px; background-color: #0891b2; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 10px;">
            View My Bookings &rarr;
          </a>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        CellsInVitro &bull; Advancing Cell Culture Education &amp; Research
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `Consultation Confirmed: ${input.consultantName} on ${input.date}`,
    html
  );
}

export async function sendConsultancyBookingAdminNotificationEmail(input: {
  to: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  consultantName: string;
  consultationType: string;
  date: string;
  startTime: string;
  endTime: string;
  amount: number;
  currency: string;
  bookingId: string;
  notes?: string | null;
}) {
  const adminDashboardUrl = `${FRONTEND_ORIGIN}/admin/consultancy`;
  const formattedAmount = `${input.currency} ${(input.amount / 100).toFixed(2)}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 24px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 20px; font-weight: 800; margin: 0 0 4px 0;">New Consultation Booking</h1>
        <p style="color: #a5f3fc; font-size: 13px; margin: 0;">A new consultation has been booked and confirmed</p>
      </div>

      <div style="padding: 28px;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Client</h3>
          <p style="margin: 2px 0; font-size: 14px; color: #0f172a;"><strong>${input.userName}</strong></p>
          <p style="margin: 2px 0; font-size: 13px; color: #64748b;">${input.userEmail}${input.userPhone ? ` &bull; ${input.userPhone}` : ""}</p>
        </div>

        <div style="background-color: #f0fdfe; border: 1px solid #a5f3fc; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; color: #0891b2; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 4px 0; color: #64748b; width: 40%;">Consultant:</td><td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${input.consultantName}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Type:</td><td style="padding: 4px 0; color: #0f172a;">${input.consultationType}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Date:</td><td style="padding: 4px 0; color: #0f172a;">${input.date}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Time:</td><td style="padding: 4px 0; color: #0f172a;">${input.startTime} – ${input.endTime}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Amount Paid:</td><td style="padding: 4px 0; font-weight: 700; color: #0891b2;">${formattedAmount}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Booking ID:</td><td style="padding: 4px 0; font-size: 12px; color: #64748b;">${input.bookingId.slice(-10).toUpperCase()}</td></tr>
          </table>
        </div>

        ${
          input.notes
            ? `<div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 10px; padding: 14px 18px; margin-bottom: 20px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; color: #854d0e; font-weight: 700; text-transform: uppercase;">Client Notes</p>
          <p style="margin: 0; font-size: 14px; color: #713f12; line-height: 1.5;">${input.notes}</p>
        </div>`
            : ""
        }

        <div style="text-align: center;">
          <a href="${adminDashboardUrl}" style="display: inline-block; padding: 11px 28px; background-color: #0891b2; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px;">
            View Consultancy Dashboard
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `[CONSULTATION] ${input.userName} booked ${input.consultantName} on ${input.date}`,
    html
  );
}

export async function notifyConsultancyBooking(bookingId: string) {
  try {
    const booking = await prisma.consultancyBooking.findUnique({
      where: { id: bookingId },
      include: {
        consultant: true,
        slot: true,
        user: { select: { name: true, email: true } },
      },
    });

    if (!booking) {
      console.warn(`[email] notifyConsultancyBooking: booking ${bookingId} not found`);
      return;
    }

    const userEmail = booking.userEmail || booking.user?.email;
    if (!userEmail) {
      console.warn(`[email] notifyConsultancyBooking: no email for booking ${bookingId}`);
      return;
    }

    const userName: string = booking.userName || booking.user?.name || userEmail.split("@")[0] || userEmail;
    const dateFormatted = booking.date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });

    // 1. Confirmation to client
    await sendConsultancyBookingConfirmationEmail({
      to: userEmail,
      userName,
      consultantName: booking.consultant.name,
      consultationType: booking.consultationType,
      date: dateFormatted,
      startTime: booking.startTime,
      endTime: booking.endTime,
      amount: booking.amount,
      currency: booking.currency,
      bookingId: booking.id,
    });

    // 2. Admin notification
    const adminEmails = await collectAdminEmails();
    for (const adminEmail of adminEmails) {
      await sendConsultancyBookingAdminNotificationEmail({
        to: adminEmail,
        userName,
        userEmail,
        userPhone: booking.userPhone,
        consultantName: booking.consultant.name,
        consultationType: booking.consultationType,
        date: dateFormatted,
        startTime: booking.startTime,
        endTime: booking.endTime,
        amount: booking.amount,
        currency: booking.currency,
        bookingId: booking.id,
        notes: booking.notes,
      });
    }
  } catch (err) {
    console.error("[email] Error in notifyConsultancyBooking:", err);
  }
}

// ─── Resource / Study Material Access ────────────────────────────────────────

export async function sendResourceAccessConfirmationEmail(input: {
  to: string;
  userName: string;
  resourceTitle: string;
  scope: string;
  amount: number;
  currency: string;
  isFree: boolean;
  accessId: string;
}) {
  const dashboardUrl = `${FRONTEND_ORIGIN}/dashboard/resources`;
  const formattedAmount = input.isFree
    ? "Free"
    : `${input.currency} ${(input.amount / 100).toFixed(2)}`;
  const scopeLabel =
    input.scope === "FULL_LIBRARY"
      ? "Full Resource Library"
      : input.scope === "MODULE"
      ? "Resource Module"
      : "Resource File";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 22px; font-weight: 800; margin: 0 0 6px 0;">Access Granted!</h1>
        <p style="color: #fed7aa; font-size: 14px; margin: 0;">${scopeLabel} is now available to you</p>
      </div>

      <div style="padding: 32px 28px;">
        <h2 style="font-size: 18px; color: #0f172a; margin: 0 0 16px 0;">Hi ${input.userName},</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
          You now have access to <strong>${input.resourceTitle}</strong>. Head to your resources dashboard to start exploring the material.
        </p>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Resource:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #0f172a; text-align: right;">${input.resourceTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Access Type:</td>
              <td style="padding: 6px 0; color: #0f172a; text-align: right;">${scopeLabel}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Access ID:</td>
              <td style="padding: 6px 0; font-size: 12px; color: #64748b; text-align: right;">${input.accessId.slice(-10).toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Amount Paid:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #ea580c; text-align: right;">${formattedAmount}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 0 0 8px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; padding: 13px 32px; background-color: #ea580c; color: #ffffff; font-weight: 700; font-size: 15px; text-decoration: none; border-radius: 10px;">
            Browse Resources &rarr;
          </a>
        </div>
      </div>

      <div style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8;">
        CellsInVitro &bull; Advancing Cell Culture Education &amp; Research
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `Access Confirmed: ${input.resourceTitle}`,
    html
  );
}

export async function sendResourceAccessAdminNotificationEmail(input: {
  to: string;
  userName: string;
  userEmail: string;
  resourceTitle: string;
  scope: string;
  amount: number;
  currency: string;
  isFree: boolean;
  accessId: string;
}) {
  const adminDashboardUrl = `${FRONTEND_ORIGIN}/admin/materials`;
  const formattedAmount = input.isFree
    ? "Free"
    : `${input.currency} ${(input.amount / 100).toFixed(2)}`;
  const scopeLabel =
    input.scope === "FULL_LIBRARY"
      ? "Full Resource Library"
      : input.scope === "MODULE"
      ? "Resource Module"
      : "Resource File";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%); padding: 24px 28px; text-align: center; color: #ffffff;">
        <h1 style="font-size: 20px; font-weight: 800; margin: 0 0 4px 0;">New Resource Access Purchase</h1>
        <p style="color: #fed7aa; font-size: 13px; margin: 0;">A user purchased access to study materials</p>
      </div>

      <div style="padding: 28px;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">User</h3>
          <p style="margin: 2px 0; font-size: 14px; color: #0f172a;"><strong>${input.userName}</strong> &bull; ${input.userEmail}</p>
        </div>

        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 12px 0; font-size: 13px; color: #ea580c; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Access Details</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
            <tr><td style="padding: 4px 0; color: #64748b; width: 40%;">Resource:</td><td style="padding: 4px 0; font-weight: 600; color: #0f172a;">${input.resourceTitle}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Access Type:</td><td style="padding: 4px 0; color: #0f172a;">${scopeLabel}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Amount:</td><td style="padding: 4px 0; font-weight: 700; color: #ea580c;">${formattedAmount}</td></tr>
            <tr><td style="padding: 4px 0; color: #64748b;">Access ID:</td><td style="padding: 4px 0; font-size: 12px; color: #64748b;">${input.accessId.slice(-10).toUpperCase()}</td></tr>
          </table>
        </div>

        <div style="text-align: center;">
          <a href="${adminDashboardUrl}" style="display: inline-block; padding: 11px 28px; background-color: #ea580c; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; border-radius: 8px;">
            View Materials Dashboard
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail(
    input.to,
    `[RESOURCE ACCESS] ${input.userName} purchased ${scopeLabel}: ${input.resourceTitle}`,
    html
  );
}

export async function notifyResourceAccess(input: {
  userId: string;
  accessId: string;
  resourceTitle: string;
  scope: string;
  amount: number;
  currency: string;
}) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { name: true, email: true },
    });
    if (!user?.email) return;

    const userName: string = user.name || user.email.split("@")[0] || user.email;
    const isFree = input.amount === 0;

    // 1. Confirmation to user
    await sendResourceAccessConfirmationEmail({
      to: user.email,
      userName,
      resourceTitle: input.resourceTitle,
      scope: input.scope,
      amount: input.amount,
      currency: input.currency,
      isFree,
      accessId: input.accessId,
    });

    // 2. Admin notification
    const adminEmails = await collectAdminEmails();
    for (const adminEmail of adminEmails) {
      await sendResourceAccessAdminNotificationEmail({
        to: adminEmail,
        userName,
        userEmail: user.email,
        resourceTitle: input.resourceTitle,
        scope: input.scope,
        amount: input.amount,
        currency: input.currency,
        isFree,
        accessId: input.accessId,
      });
    }
  } catch (err) {
    console.error("[email] Error in notifyResourceAccess:", err);
  }
}

export async function sendStockLabInviteEmail(input: {
  to: string;
  inviterName: string;
  labName: string;
  role: string;
  acceptUrl: string;
}) {
  const subject = `You've been invited to join ${input.labName} on CellsInVitro`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
      <h2 style="color: #0f172a; margin-top: 0;">Lab Workspace Invitation</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        <strong>${input.inviterName}</strong> has invited you to join the lab workspace <strong>${input.labName}</strong> as a <strong>${input.role}</strong>.
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Accept this invitation to start collaborating on lab stock, reagents, inventory tracking, and stock requests.
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${input.acceptUrl}" style="background-color: #0f172a; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 12px; display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 12px;">
        If you cannot click the button above, copy and paste this link into your browser:<br>
        <a href="${input.acceptUrl}" style="color: #2563eb;">${input.acceptUrl}</a>
      </p>
    </div>
  `;
  return sendEmail(input.to, subject, html);
}

