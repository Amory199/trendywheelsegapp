import PDFDocument from "pdfkit";

// Brand palette (mirrors packages/ui-tokens).
const BLUE = "#2B0FF8";
const PINK = "#FF0065";
const INK = "#02011F";
const MUTED = "#6b7280";
const HAIR = "#e5e7eb";

export interface InvoiceLine {
  description: string;
  qty: string; // e.g. "7 days", "1"
  amount: number;
}

export interface InvoiceRenderData {
  number: number;
  dateISO: string;
  typeLabel: string; // "Rental", "Vehicle sale", "Service", "Customization"
  customerName: string;
  customerPhone: string;
  paymentFor: string;
  fromTo?: { from: string; to: string } | null;
  lines: InvoiceLine[];
  subtotal: number;
  taxLabel: string; // "VAT 14%"
  tax: number;
  total: number;
  paidBy?: string | null; // "cash" | "card" | null
  company: { name: string; address: string; phone: string };
  currency: string; // "EGP"
}

const money = (n: number, ccy: string): string =>
  `${ccy} ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Render the branded receipt to a PDF Buffer. Mirrors the company's
// "TW receipt" layout: blue wordmark, receipt no./date, Received From, the
// payment lines, Paid-by boxes, totals and the company footer block.
export function renderInvoicePdf(d: InvoiceRenderData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const L = 50;
    const R = doc.page.width - 50;

    // ── Header: wordmark + a small pink swoosh, receipt no/date on the right ──
    doc.fillColor(BLUE).font("Helvetica-Bold").fontSize(26).text("Trendy Wheels", L, 50);
    doc.save();
    doc
      .moveTo(L, 84)
      .lineTo(L + 26, 84)
      .lineWidth(4)
      .strokeColor(PINK)
      .stroke();
    doc.restore();

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .fillColor(INK)
      .text("RECEIPT", L, 50, {
        width: R - L,
        align: "right",
      });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(MUTED)
      .text(`No.  TW-${String(d.number).padStart(5, "0")}`, L, 78, { width: R - L, align: "right" })
      .text(`Date  ${new Date(d.dateISO).toLocaleDateString("en-GB")}`, L, 92, {
        width: R - L,
        align: "right",
      })
      .text(d.typeLabel, L, 106, { width: R - L, align: "right" });

    doc.moveTo(L, 128).lineTo(R, 128).lineWidth(1).strokeColor(HAIR).stroke();

    // ── Received From ──
    let y = 146;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(MUTED).text("RECEIVED FROM", L, y);
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor(INK)
      .text(d.customerName, L, y + 14);
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor(MUTED)
      .text(d.customerPhone, L, y + 32);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(MUTED)
      .text("FOR PAYMENT OF", L, y, {
        width: R - L,
        align: "right",
      });
    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(INK)
      .text(d.paymentFor, L + 200, y + 14, {
        width: R - (L + 200),
        align: "right",
      });
    if (d.fromTo) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(MUTED)
        .text(`From ${d.fromTo.from}  to  ${d.fromTo.to}`, L + 200, y + 34, {
          width: R - (L + 200),
          align: "right",
        });
    }

    // ── Line items table ──
    y += 64;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(1).strokeColor(HAIR).stroke();
    y += 8;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(MUTED);
    doc.text("DESCRIPTION", L, y);
    doc.text("QTY", L, y, { width: 320, align: "right" });
    doc.text("AMOUNT", L, y, { width: R - L, align: "right" });
    y += 16;
    doc.font("Helvetica").fontSize(11).fillColor(INK);
    for (const line of d.lines) {
      doc.text(line.description, L, y, { width: 300 });
      doc.text(line.qty, L, y, { width: 320, align: "right" });
      doc.text(money(line.amount, d.currency), L, y, { width: R - L, align: "right" });
      y += 20;
    }

    // ── Totals ──
    y += 6;
    doc
      .moveTo(L + 280, y)
      .lineTo(R, y)
      .lineWidth(1)
      .strokeColor(HAIR)
      .stroke();
    y += 10;
    const totalRow = (label: string, value: string, bold = false): void => {
      doc
        .font(bold ? "Helvetica-Bold" : "Helvetica")
        .fontSize(bold ? 13 : 10)
        .fillColor(bold ? INK : MUTED)
        .text(label, L + 280, y, { width: 120 })
        .fillColor(bold ? PINK : INK)
        .text(value, L + 280, y, { width: R - (L + 280), align: "right" });
      y += bold ? 22 : 18;
    };
    totalRow("Subtotal", money(d.subtotal, d.currency));
    totalRow(d.taxLabel, money(d.tax, d.currency));
    totalRow("TOTAL", money(d.total, d.currency), true);

    // ── Paid by ──
    const box = (label: string, checked: boolean, bx: number): void => {
      doc.rect(bx, y, 11, 11).lineWidth(1).strokeColor(INK).stroke();
      if (checked)
        doc
          .font("Helvetica-Bold")
          .fontSize(10)
          .fillColor(PINK)
          .text("X", bx + 2, y - 1);
      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(INK)
        .text(label, bx + 16, y);
    };
    doc.font("Helvetica-Bold").fontSize(10).fillColor(MUTED).text("PAID BY", L, y);
    box("Cash", d.paidBy === "cash", L + 70);
    box("Card", d.paidBy === "card", L + 140);
    y += 30;

    // ── Footer: company block ──
    const footerY = doc.page.height - 110;
    doc.moveTo(L, footerY).lineTo(R, footerY).lineWidth(1).strokeColor(HAIR).stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(BLUE)
      .text(d.company.name, L, footerY + 12);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(MUTED)
      .text(d.company.address, L, footerY + 30)
      .text(d.company.phone, L, footerY + 44);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(MUTED)
      .text("Thank you for choosing Trendy Wheels.", L, footerY + 12, {
        width: R - L,
        align: "right",
      });

    doc.end();
  });
}
