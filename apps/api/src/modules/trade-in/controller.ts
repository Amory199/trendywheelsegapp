import type { Request, Response } from "express";
import { z } from "zod";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

const submitSchema = z.object({
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  year: z.coerce.number().int().min(1990).max(2100),
  condition: z.enum(["excellent", "good", "fair", "poor"]),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.string().url()).max(8).default([]),
});

const quoteSchema = z.object({
  quoteEgp: z.coerce.number().nonnegative(),
  validForDays: z.coerce.number().int().positive().default(7),
  status: z.enum(["quoted", "rejected"]).default("quoted"),
});

export async function submit(req: Request, res: Response): Promise<void> {
  const input = submitSchema.parse(req.body);
  const ti = await prisma.tradeInQuote.create({
    data: { ...input, userId: req.user!.userId },
  });
  res.status(201).json({ data: ti });
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const items = await prisma.tradeInQuote.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: items });
}

export async function listAll(_req: Request, res: Response): Promise<void> {
  const items = await prisma.tradeInQuote.findMany({
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  res.json({ data: items });
}

export async function quote(req: Request, res: Response): Promise<void> {
  const input = quoteSchema.parse(req.body);
  const validUntil = new Date(Date.now() + input.validForDays * 86400_000);
  const updated = await prisma.tradeInQuote.update({
    where: { id: req.params.id },
    data: {
      status: input.status,
      quoteEgp: input.status === "quoted" ? input.quoteEgp : null,
      quoteValidUntil: input.status === "quoted" ? validUntil : null,
    },
  });
  res.json({ data: updated });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const item = await prisma.tradeInQuote.findUnique({ where: { id: req.params.id } });
  if (!item) throw AppError.notFound("Trade-in not found");
  const isStaff = req.user!.accountType === "admin" || req.user!.accountType === "staff";
  if (!isStaff && item.userId !== req.user!.userId) throw AppError.forbidden();
  res.json({ data: item });
}
