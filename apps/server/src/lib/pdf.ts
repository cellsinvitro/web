import PDFDocument from "pdfkit";

export interface KitOrderInvoiceData {
  id: string;
  createdAt: Date;
  completedAt?: Date | null;
  amount: number;
  currency: string;
  quantity: number;
  itemTitle: string;
  unitAmount?: number | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  shippingAddress?: string | null;
  provider?: string | null;
  providerPaymentId?: string | null;
}

export function generateKitOrderInvoicePdf(order: KitOrderInvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const buffers: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", (err: Error) => reject(err));

      const primaryColor = "#0F172A"; // Slate 900
      const accentColor = "#2563EB"; // Blue 600
      const textMuted = "#64748B"; // Slate 500
      const borderColor = "#E2E8F0"; // Slate 200
      const bgLight = "#F8FAFC"; // Slate 50

      // --- Header Section ---
      doc.fillColor(primaryColor).fontSize(22).font("Helvetica-Bold").text("CellsInVitro", 40, 40);
      doc.fontSize(9).font("Helvetica").fillColor(textMuted).text("Advancing Cell Culture Education & Research", 40, 66);

      // Invoice Badge / Title
      doc.fillColor(accentColor).fontSize(18).font("Helvetica-Bold").text("TAX INVOICE / RECEIPT", 360, 40, { align: "right" });
      doc.fontSize(9).font("Helvetica").fillColor(textMuted).text(`Invoice No: INV-${order.id.slice(-8).toUpperCase()}`, 360, 64, { align: "right" });
      doc.text(`Date: ${order.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 360, 77, { align: "right" });

      // Horizontal Divider
      doc.moveTo(40, 100).lineTo(555, 100).strokeColor(borderColor).lineWidth(1).stroke();

      // --- Order & Customer Details (2 Columns) ---
      const detailsTop = 115;

      // Customer Details (Left Box)
      doc.rect(40, detailsTop, 250, 110).fillAndStroke(bgLight, borderColor);
      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("Billed & Shipped To:", 52, detailsTop + 10);
      
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1E293B").text(order.customerName || "Valued Customer", 52, detailsTop + 26);
      doc.font("Helvetica").fillColor(textMuted);
      doc.text(`Email: ${order.customerEmail || "N/A"}`, 52, detailsTop + 40);
      doc.text(`Phone: ${order.customerPhone || "N/A"}`, 52, detailsTop + 53);

      const addressLines = (order.shippingAddress || "N/A").split("\n").join(", ");
      doc.text(`Address: ${addressLines}`, 52, detailsTop + 66, { width: 226, height: 35, ellipsis: true });

      // Order Summary (Right Box)
      doc.rect(305, detailsTop, 250, 110).fillAndStroke(bgLight, borderColor);
      doc.fillColor(primaryColor).fontSize(10).font("Helvetica-Bold").text("Order Summary:", 317, detailsTop + 10);

      doc.fontSize(9).font("Helvetica").fillColor(textMuted);
      doc.text("Order ID:", 317, detailsTop + 28);
      doc.font("Helvetica-Bold").fillColor(primaryColor).text(order.id, 390, detailsTop + 28, { width: 155, ellipsis: true });

      doc.font("Helvetica").fillColor(textMuted).text("Payment Method:", 317, detailsTop + 43);
      doc.font("Helvetica-Bold").fillColor(primaryColor).text(order.provider || "RAZORPAY", 390, detailsTop + 43);

      if (order.providerPaymentId) {
        doc.font("Helvetica").fillColor(textMuted).text("Transaction ID:", 317, detailsTop + 58);
        doc.font("Helvetica-Bold").fillColor(primaryColor).text(order.providerPaymentId, 390, detailsTop + 58, { width: 155, ellipsis: true });
      }

      doc.font("Helvetica").fillColor(textMuted).text("Payment Status:", 317, detailsTop + 73);
      doc.font("Helvetica-Bold").fillColor("#16A34A").text("PAID", 390, detailsTop + 73);

      // --- Line Items Table ---
      const tableTop = 245;

      // Table Header Background
      doc.rect(40, tableTop, 515, 24).fill("#0F172A");

      // Table Headers
      doc.fillColor("#FFFFFF").fontSize(9).font("Helvetica-Bold");
      doc.text("Item Description", 52, tableTop + 7);
      doc.text("Qty", 340, tableTop + 7, { width: 40, align: "center" });
      doc.text("Unit Price", 390, tableTop + 7, { width: 75, align: "right" });
      doc.text("Total", 475, tableTop + 7, { width: 70, align: "right" });

      // Table Body
      const itemRowTop = tableTop + 24;
      doc.rect(40, itemRowTop, 515, 36).fillAndStroke("#FFFFFF", borderColor);

      const currencySymbol = order.currency === "INR" ? "INR " : `${order.currency} `;
      const unitPrice = order.unitAmount ?? (order.quantity > 0 ? order.amount / order.quantity : order.amount);

      doc.fillColor(primaryColor).fontSize(9).font("Helvetica-Bold");
      doc.text(order.itemTitle, 52, itemRowTop + 12, { width: 270, ellipsis: true });

      doc.font("Helvetica").fillColor("#334155");
      doc.text(String(order.quantity), 340, itemRowTop + 12, { width: 40, align: "center" });
      doc.text(`${currencySymbol}${unitPrice.toFixed(2)}`, 390, itemRowTop + 12, { width: 75, align: "right" });
      doc.font("Helvetica-Bold").text(`${currencySymbol}${order.amount.toFixed(2)}`, 475, itemRowTop + 12, { width: 70, align: "right" });

      // --- Total & Summary Box ---
      const totalTop = itemRowTop + 48;

      doc.rect(305, totalTop, 250, 60).fillAndStroke(bgLight, borderColor);

      doc.fontSize(9).font("Helvetica").fillColor(textMuted).text("Subtotal:", 317, totalTop + 10);
      doc.font("Helvetica").fillColor(primaryColor).text(`${currencySymbol}${order.amount.toFixed(2)}`, 450, totalTop + 10, { width: 95, align: "right" });

      doc.fontSize(9).font("Helvetica").fillColor(textMuted).text("Shipping Fee:", 317, totalTop + 25);
      doc.font("Helvetica").fillColor("#16A34A").text("FREE", 450, totalTop + 25, { width: 95, align: "right" });

      doc.moveTo(317, totalTop + 40).lineTo(545, totalTop + 40).strokeColor(borderColor).lineWidth(1).stroke();

      doc.fontSize(11).font("Helvetica-Bold").fillColor(primaryColor).text("Total Amount Paid:", 317, totalTop + 44);
      doc.fontSize(11).font("Helvetica-Bold").fillColor(accentColor).text(`${currencySymbol}${order.amount.toFixed(2)}`, 430, totalTop + 44, { width: 115, align: "right" });

      // --- Footer / Terms ---
      const footerTop = 410;
      doc.moveTo(40, footerTop).lineTo(555, footerTop).strokeColor(borderColor).lineWidth(1).stroke();

      doc.fontSize(9).font("Helvetica-Bold").fillColor(primaryColor).text("Thank you for your order!", 40, footerTop + 15);
      doc.fontSize(8).font("Helvetica").fillColor(textMuted).text("If you have any questions regarding your kit delivery or research materials, please reach out to cellsinvitro.w@gmail.com.", 40, footerTop + 28, { width: 515 });

      doc.fontSize(8).font("Helvetica").fillColor("#94A3B8").text("This is a computer-generated invoice and requires no signature.", 40, footerTop + 50, { align: "center", width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
