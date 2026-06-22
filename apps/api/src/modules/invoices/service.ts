import type { Prisma } from "@prisma/client";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { uploadObject } from "../../utils/storage.js";

import { renderInvoicePdf, type InvoiceLine, type InvoiceRenderData } from "./render.js";

export type SourceType = "booking" | "reservation" | "maintenance" | "customization";

// Company details default to the values on the printed receipt; SystemConfig
// overrides them when the admin fills those fields in.
const DEFAULT_COMPANY = {
  name: "Trendy Wheels",
  address: "360 mall, palm hills extension, 6th of October city",
  phone: "+201599999577",
};

const TYPE_MAP: Record<
  SourceType,
  { invoiceType: "rental" | "sale" | "service" | "customization"; label: string }
> = {
  booking: { invoiceType: "rental", label: "Rental" },
  reservation: { invoiceType: "sale", label: "Vehicle sale" },
  maintenance: { invoiceType: "service", label: "Service" },
  customization: { invoiceType: "customization", label: "Customization" },
};

interface ResolvedSource {
  user: { name: string; phone: string; id: string };
  paymentFor: string;
  lines: InvoiceLine[];
  subtotal: number;
  fromTo?: { from: string; to: string } | null;
}

const fmtDate = (d: Date): string => new Date(d).toLocaleDateString("en-GB");

async function resolveSource(sourceType: SourceType, sourceId: string): Promise<ResolvedSource> {
  if (sourceType === "booking") {
    const b = await prisma.booking.findUnique({
      where: { id: sourceId },
      include: { user: true, vehicle: true },
    });
    if (!b) throw AppError.notFound("Booking not found");
    const days =
      Math.max(
        1,
        Math.round((b.endDate.getTime() - b.startDate.getTime()) / (1000 * 60 * 60 * 24)),
      ) || 1;
    const subtotal = Number(b.totalCost);
    return {
      user: { name: b.user.name || b.user.phone, phone: b.user.phone, id: b.user.id },
      paymentFor: `Rental — ${b.vehicle.name}`,
      lines: [
        { description: `Rental — ${b.vehicle.name}`, qty: `${days} day(s)`, amount: subtotal },
      ],
      subtotal,
      fromTo: { from: fmtDate(b.startDate), to: fmtDate(b.endDate) },
    };
  }
  if (sourceType === "reservation") {
    const r = await prisma.reservation.findUnique({
      where: { id: sourceId },
      include: { user: true, vehicle: true },
    });
    if (!r) throw AppError.notFound("Reservation not found");
    const subtotal = Number(r.amountEgp);
    return {
      user: { name: r.user.name || r.user.phone, phone: r.user.phone, id: r.user.id },
      paymentFor: `Vehicle purchase — ${r.vehicle.name}`,
      lines: [{ description: `Vehicle — ${r.vehicle.name}`, qty: "1", amount: subtotal }],
      subtotal,
    };
  }
  if (sourceType === "maintenance") {
    const m = await prisma.maintenanceRequest.findUnique({
      where: { id: sourceId },
      include: { user: true },
    });
    if (!m) throw AppError.notFound("Maintenance request not found");
    const subtotal = Number(m.estimatedCost ?? 0);
    return {
      user: { name: m.user.name || m.user.phone, phone: m.user.phone, id: m.user.id },
      paymentFor: `Service — ${m.serviceType}`,
      lines: [{ description: `Service — ${m.serviceType}`, qty: "1", amount: subtotal }],
      subtotal,
    };
  }
  // customization
  const c = await prisma.customizationRequest.findUnique({
    where: { id: sourceId },
    include: { user: true },
  });
  if (!c) throw AppError.notFound("Customization request not found");
  const subtotal = Number(c.budget ?? 0);
  return {
    user: { name: c.user.name || c.user.phone, phone: c.user.phone, id: c.user.id },
    paymentFor: `Customization — ${c.kind}`,
    lines: [{ description: `Customization — ${c.kind}`, qty: "1", amount: subtotal }],
    subtotal,
  };
}

export async function generateInvoice(
  sourceType: SourceType,
  sourceId: string,
  issuedById: string,
  paidBy?: string | null,
): Promise<Prisma.InvoiceGetPayload<{ include: { user: true } }>> {
  const resolved = await resolveSource(sourceType, sourceId);

  const config = await prisma.systemConfig.findFirst();
  const taxRate = Number(config?.taxRatePct ?? 14);
  const currency = config?.currency ?? "EGP";
  const company = {
    name: config?.companyName || DEFAULT_COMPANY.name,
    address: config?.companyAddress || DEFAULT_COMPANY.address,
    phone: config?.companyPhone || DEFAULT_COMPANY.phone,
  };

  const subtotal = Math.round(resolved.subtotal * 100) / 100;
  const tax = Math.round(subtotal * taxRate) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  // Sequential human number — low volume, compute max+1 in a transaction.
  const created = await prisma.$transaction(async (tx) => {
    const last = await tx.invoice.aggregate({ _max: { number: true } });
    const number = (last._max.number ?? 1000) + 1;

    const renderData: InvoiceRenderData = {
      number,
      dateISO: new Date().toISOString(),
      typeLabel: TYPE_MAP[sourceType].label,
      customerName: resolved.user.name,
      customerPhone: resolved.user.phone,
      paymentFor: resolved.paymentFor,
      fromTo: resolved.fromTo ?? null,
      lines: resolved.lines,
      subtotal,
      taxLabel: `VAT ${taxRate}%`,
      tax,
      total,
      paidBy: paidBy ?? null,
      company,
      currency,
    };
    const pdf = await renderInvoicePdf(renderData);
    const { key } = await uploadObject("invoices", pdf, "application/pdf");

    return tx.invoice.create({
      data: {
        number,
        type: TYPE_MAP[sourceType].invoiceType,
        userId: resolved.user.id,
        sourceType,
        sourceId,
        subtotalEgp: subtotal,
        taxEgp: tax,
        totalEgp: total,
        paidBy: paidBy ?? null,
        pdfKey: key,
        issuedById,
      },
      include: { user: true },
    });
  });

  return created;
}
