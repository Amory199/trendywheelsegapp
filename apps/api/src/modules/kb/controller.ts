import type { Request, Response } from "express";

import { prisma } from "../../config/database.js";
import { AppError } from "../../utils/errors.js";

export async function list(req: Request, res: Response): Promise<void> {
  const { category, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));

  const where = category ? { category } : {};
  const [articles, total] = await Promise.all([
    prisma.kBArticle.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, category: true, viewsCount: true, helpfulCount: true, createdAt: true, updatedAt: true },
    }),
    prisma.kBArticle.count({ where }),
  ]);

  res.json({ data: articles, total, page: pageNum, limit: limitNum });
}

export async function search(req: Request, res: Response): Promise<void> {
  const { q } = req.query as Record<string, string>;
  if (!q || q.trim().length < 2) {
    res.json({ data: [] });
    return;
  }

  const articles = await prisma.$queryRaw<{ id: string; title: string; category: string; created_at: Date }[]>`
    SELECT id, title, category, created_at
    FROM kb_articles
    WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${q})
    ORDER BY ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', ${q})) DESC
    LIMIT 20
  `;

  res.json({ data: articles });
}

export async function getById(req: Request, res: Response): Promise<void> {
  const article = await prisma.kBArticle.findUnique({ where: { id: req.params.id } });
  if (!article) throw AppError.notFound("Article not found");

  // Increment view count
  await prisma.kBArticle.update({ where: { id: req.params.id }, data: { viewsCount: { increment: 1 } } });

  res.json({ data: article });
}

export async function create(req: Request, res: Response): Promise<void> {
  const { title, content, category } = req.body as { title: string; content: string; category: string };
  const article = await prisma.kBArticle.create({ data: { title, content, category } });
  res.status(201).json({ data: article });
}

export async function update(req: Request, res: Response): Promise<void> {
  const existing = await prisma.kBArticle.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Article not found");

  const { title, content, category } = req.body as { title?: string; content?: string; category?: string };
  const article = await prisma.kBArticle.update({
    where: { id: req.params.id },
    data: { ...(title && { title }), ...(content && { content }), ...(category && { category }) },
  });
  res.json({ data: article });
}

export async function remove(req: Request, res: Response): Promise<void> {
  const existing = await prisma.kBArticle.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Article not found");

  await prisma.kBArticle.delete({ where: { id: req.params.id } });
  res.json({ success: true });
}

export async function rate(req: Request, res: Response): Promise<void> {
  const existing = await prisma.kBArticle.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound("Article not found");

  const { helpful } = req.body as { helpful: boolean };
  if (helpful) {
    await prisma.kBArticle.update({ where: { id: req.params.id }, data: { helpfulCount: { increment: 1 } } });
  }
  res.json({ success: true });
}
