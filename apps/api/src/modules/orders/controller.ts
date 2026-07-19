import type { Request, Response } from "express";

import { canAdvance, ORDER_STAGES, stageIndex, type OrderStage } from "@trendywheels/types";
import {
  advanceStageSchema,
  createOrderSchema,
  updateOrderStatusSchema,
} from "@trendywheels/validators";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";
import { emitDomainEvent, notifyAdmins, notifyUser } from "../../utils/notify.js";

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
      dropoffLocationUrl: input.dropoffLocationUrl ?? null,
      fulfillmentType: input.fulfillmentType ?? null,
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

  // Every customer request must reach the team (admin + staff) as a push.
  await notifyAdmins(`order-${order.id}`, {
    type: "order_placed",
    title: "New order",
    body: `New order — EGP ${total.toLocaleString()} · ${order.items.length} item(s).`,
    data: { orderId: order.id, url: "/admin/orders" },
  });

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
    include: {
      items: { include: { product: true } },
      // Buyer + id images so staff opening the order in the app can verify them.
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          idFrontUrl: true,
          idBackUrl: true,
        },
      },
    },
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
      // Contact fields only — deliberately NOT the national-ID scans. This board
      // is staff-wide (any staffRole) and returns the 100 most recent buyers, so
      // including idFront/Back would hand every mechanic a bulk ID-document
      // export. Staff who are actually fulfilling one order still get the images
      // from getById, which is scoped to a single record.
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
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

function isStaffUser(req: Request): boolean {
  return req.user!.accountType === "admin" || req.user!.accountType === "staff";
}

// Customer-facing copy per pipeline stage — the buyer sees the same milestones
// staff tick off.
const ORDER_STAGE_NOTICE: Record<OrderStage, { title: string; body: string }> = {
  requested: { title: "Order received", body: "We're reviewing your order now." },
  approved: { title: "Order approved", body: "Your order is confirmed and being prepared." },
  customer_confirmed: {
    title: "Order locked in",
    body: "Thanks for confirming — we're packing your items.",
  },
  payment_collected: { title: "Payment received", body: "Your order is fully paid. Thank you." },
  delivered: { title: "Order delivered", body: "Your order has been delivered. Enjoy." },
  closed: { title: "Order complete", body: "All done — thanks for shopping with us." },
};

// POST /api/orders/:id/stage — staff move the order down the fulfilment
// pipeline. Order.status stays the source of truth for everything already
// built, so each stage writes it in the SAME update.
export async function advanceStage(req: Request, res: Response): Promise<void> {
  if (!isStaffUser(req)) throw AppError.forbidden();
  const input = advanceStageSchema.parse(req.body);
  if (stageIndex(ORDER_STAGES, input.stage) < 0) {
    throw AppError.badRequest(`"${input.stage}" is not an order stage`);
  }
  const stage = input.stage as OrderStage;

  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) throw AppError.notFound("Order not found");
  // A cancelled order is off the pipeline — otherwise it could be walked
  // forward and end up "delivered" after the fact.
  if (order.status === "cancelled") {
    throw AppError.conflict("This order was cancelled — it can no longer move down the pipeline");
  }
  if (!canAdvance(ORDER_STAGES, order.stage, stage)) {
    throw AppError.conflict(
      `Cannot move this order from "${order.stage}" to "${stage}" — the pipeline moves one step at a time. Add a note instead.`,
    );
  }

  const data: { stage: OrderStage; status?: string } = { stage };
  if (stage === "payment_collected") data.status = "paid";
  // "closed" is the bookkeeping end of a delivered order — there is no
  // separate status for it, so it stays "delivered".
  if (stage === "delivered" || stage === "closed") data.status = "delivered";

  // Compare-and-set on the stage we read, so two concurrent staff can't both
  // advance the same order. Interactive tx so the timeline row is only written
  // when the claim wins.
  const updated = await prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: order.id, stage: order.stage },
      data,
    });
    if (claimed.count !== 1) return null;
    await tx.stageEvent.create({
      data: {
        entityType: "order",
        entityId: order.id,
        stage,
        note: input.note ?? null,
        actorId: req.user!.userId,
      },
    });
    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  });
  if (!updated) {
    throw AppError.conflict("Someone else just moved this order — reopen it to see where it is");
  }

  emitDomainEvent("order.updated", order.id, order.userId, { stage });
  const notice = ORDER_STAGE_NOTICE[stage];
  await notifyUser(order.userId, `order-stage-${stage}-${order.id}`, {
    type: "order_stage_changed",
    title: notice.title,
    body: notice.body,
    data: { orderId: order.id, stage, url: "/shop/my-orders" },
  });
  res.json({ data: updated });
}

// GET /api/orders/:id/stage-events — pipeline history, newest first. Staff or
// the order's own customer, matching getById's visibility rule.
export async function stageEvents(req: Request, res: Response): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    select: { id: true, userId: true },
  });
  if (!order) throw AppError.notFound("Order not found");
  const isStaff = isStaffUser(req);
  if (!isStaff && order.userId !== req.user!.userId) throw AppError.forbidden();
  const events = await prisma.stageEvent.findMany({
    where: { entityType: "order", entityId: order.id },
    orderBy: { createdAt: "desc" },
  });
  // Internal staff notes stay internal — see the booking equivalent.
  res.json({
    data: isStaff ? events : events.map(({ note: _n, actorId: _a, ...rest }) => rest),
  });
}
