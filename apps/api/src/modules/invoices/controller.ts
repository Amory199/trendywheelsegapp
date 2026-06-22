import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { publicUrl } from "../../utils/storage.js";

import { generateInvoice, type SourceType } from "./service.js";

const createSchema = z.object({
  sourceType: z.enum(["booking", "reservation", "maintenance", "customization"]),
  sourceId: z.string().min(1),
  paidBy: z.enum(["cash", "card"]).nullable().optional(),
});

// POST /api/invoices — admin generates a branded receipt PDF for a transaction.
export async function create(req: Request, res: Response): Promise<void> {
  const input = createSchema.parse(req.body);
  const invoice = await generateInvoice(
    input.sourceType as SourceType,
    input.sourceId,
    req.user!.userId,
    input.paidBy ?? null,
  );
  res.status(201).json({ data: { ...invoice, pdfUrl: publicUrl(invoice.pdfKey) } });
}

// GET /api/invoices — admin list, newest first.
export async function list(_req: Request, res: Response): Promise<void> {
  const items = await prisma.invoice.findMany({
    include: { user: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({
    data: items.map((i) => ({ ...i, pdfUrl: publicUrl(i.pdfKey) })),
  });
}

// GET /api/invoices/:id/pdf — redirect to the stored PDF.
export async function pdf(req: Request, res: Response): Promise<void> {
  const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id } });
  if (!invoice) throw AppError.notFound("Invoice not found");
  res.redirect(publicUrl(invoice.pdfKey));
}
