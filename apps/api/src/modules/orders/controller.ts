import type { Request, Response } from "express";

import { createOrderSchema, updateOrderStatusSchema } from "@trendywheels/validators";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

export async function create(req: Request, res: Response): Promise<void> {
  const input = createOrderSchema.parse(req.body);
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== input.items.length) {
    throw AppError.badRequest("One or more products not found");
  }

  let total = 0;
  const itemsData = input.items.map((i) => {
    const p = products.find((pp) => pp.id === i.productId);
    if (!p) throw AppError.badRequest("Product missing");
    if (!p.inStock) throw AppError.badRequest(`${p.name} is out of stock`);
    const unit = Number(p.priceEgp);
    total += unit * i.quantity;
    return { productId: i.productId, quantity: i.quantity, unitPriceEgp: unit };
  });

  // Apply trade-in credit if provided + valid.
  if (input.tradeInId) {
    const ti = await prisma.tradeInQuote.findUnique({ where: { id: input.tradeInId } });
    if (!ti || ti.userId !== req.user!.userId) throw AppError.notFound("Trade-in not found");
    if (ti.status !== "quoted" || !ti.quoteEgp)
      throw AppError.badRequest("Trade-in not quoted yet");
    if (ti.quoteValidUntil && ti.quoteValidUntil < new Date()) {
      throw AppError.badRequest("Trade-in quote expired");
    }
    total = Math.max(0, total - Number(ti.quoteEgp));
  }

  const order = await prisma.order.create({
    data: {
      userId: req.user!.userId,
      totalEgp: total,
      tradeInId: input.tradeInId ?? null,
      items: { create: itemsData },
    },
    include: { items: { include: { product: true } } },
  });

  if (input.tradeInId) {
    await prisma.tradeInQuote.update({
      where: { id: input.tradeInId },
      data: { status: "accepted", appliedToOrderId: order.id },
    });
  }

  res.status(201).json({ data: order });
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.userId },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json({ data: orders });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: { include: { product: true } } },
  });
  if (!order) throw AppError.notFound("Order not found");
  const isStaff = req.user!.accountType === "admin" || req.user!.accountType === "staff";
  if (!isStaff && order.userId !== req.user!.userId) throw AppError.forbidden();
  res.json({ data: order });
}

export async function listAll(req: Request, res: Response): Promise<void> {
  const orders = await prisma.order.findMany({
    include: {
      items: { include: { product: true } },
      user: { select: { id: true, name: true, email: true, phone: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ data: orders });
}

export async function setStatus(req: Request, res: Response): Promise<void> {
  const { status } = updateOrderStatusSchema.parse(req.body);
  const order = await prisma.order.update({
    where: { id: req.params.id },
    data: { status },
  });
  res.json({ data: order });
}
