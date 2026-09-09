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
