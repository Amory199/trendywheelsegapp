import type { Request, Response } from "express";

import { quoteTradeInSchema, submitTradeInSchema } from "@trendywheels/validators";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { notifyAdmins } from "../../utils/notify.js";

export async function submit(req: Request, res: Response): Promise<void> {
  const input = submitTradeInSchema.parse(req.body);
  const ti = await prisma.tradeInQuote.create({
    data: { ...input, userId: req.user!.userId },
  });
  // Every customer request must reach the team (admin + staff) as a push.
  await notifyAdmins(`trade-in-${ti.id}`, {
    type: "trade_in_submitted",
    title: "New trade-in request",
    body: "A customer submitted a trade-in — review and send a quote.",
    data: { tradeInId: ti.id, url: "/admin/service-requests" },
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
  const input = quoteTradeInSchema.parse(req.body);
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
