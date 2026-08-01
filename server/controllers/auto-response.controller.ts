import type { Request, Response } from "express";
import { db } from "../db";
import { autoResponses, channels } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { AppError, asyncHandler } from "../middlewares/error.middleware";
import { storage } from "../storage";

// ─── Tenant-scope helper ─────────────────────────────────────────────────────
async function resolveOwnerChannelIds(req: Request): Promise<string[]> {
  const user = (req.session as any)?.user ?? (req as any).user;
  if (!user) throw new AppError(401, "Not authenticated");
  if (user.role === "superadmin") return []; // empty = all channels
  const ownerId = user.role === "team" ? user.createdBy : user.id;
  const owned = await storage.getChannelsByUserId(ownerId);
  return owned.map((c: any) => c.id);
}

// ─── GET /api/auto-responses?channelId=xxx ────────────────────────────────
export const getAutoResponses = asyncHandler(async (req: Request, res: Response) => {
  const user = (req.session as any)?.user;
  if (!user) throw new AppError(401, "Not authenticated");

  const channelId = req.query.channelId as string | undefined;
  const ownedIds = await resolveOwnerChannelIds(req);

  // If user is admin and channelId is provided, validate ownership
  if (channelId) {
    if (ownedIds.length > 0 && !ownedIds.includes(channelId)) {
      throw new AppError(403, "Access denied to this channel");
    }
    const rows = await db
      .select()
      .from(autoResponses)
      .where(eq(autoResponses.channelId, channelId))
      .orderBy(desc(autoResponses.createdAt));
    return res.json(rows);
  }

  // Superadmin: return all; others: return all for owned channels
  if (ownedIds.length === 0 && user.role !== "superadmin") {
    return res.json([]);
  }

  const rows = await db
    .select()
    .from(autoResponses)
    .orderBy(desc(autoResponses.createdAt));

  const filtered = user.role === "superadmin"
    ? rows
    : rows.filter((r) => ownedIds.includes(r.channelId));

  return res.json(filtered);
});

// ─── POST /api/auto-responses ─────────────────────────────────────────────
export const createAutoResponse = asyncHandler(async (req: Request, res: Response) => {
  const user = (req.session as any)?.user;
  if (!user) throw new AppError(401, "Not authenticated");

  const { channelId, name, keywords, responseMessage, type, responseType, mediaUrl, matchMode, isCaseSensitive, status } = req.body;

  if (!channelId) throw new AppError(400, "channelId is required");
  if (!name) throw new AppError(400, "name is required");
  if (!keywords) throw new AppError(400, "keywords is required");
  if (!responseMessage) throw new AppError(400, "responseMessage is required");

  // Validate ownership
  const ownedIds = await resolveOwnerChannelIds(req);
  if (ownedIds.length > 0 && !ownedIds.includes(channelId)) {
    throw new AppError(403, "Access denied to this channel");
  }

  const [row] = await db.insert(autoResponses).values({
    channelId,
    createdBy: user.id,
    name: name.trim(),
    keywords: keywords.trim(),
    responseMessage: responseMessage.trim(),
    type: type || "greeting",
    responseType: responseType || "text",
    mediaUrl: mediaUrl || null,
    matchMode: matchMode || "contains",
    isCaseSensitive: isCaseSensitive ?? false,
    status: status || "active",
  }).returning();

  return res.status(201).json(row);
});

// ─── PUT /api/auto-responses/:id ─────────────────────────────────────────
export const updateAutoResponse = asyncHandler(async (req: Request, res: Response) => {
  const user = (req.session as any)?.user;
  if (!user) throw new AppError(401, "Not authenticated");

  const { id } = req.params;
  const existing = await db.query.autoResponses.findFirst({ where: eq(autoResponses.id, id) });
  if (!existing) throw new AppError(404, "Auto response not found");

  // Validate ownership
  const ownedIds = await resolveOwnerChannelIds(req);
  if (ownedIds.length > 0 && !ownedIds.includes(existing.channelId)) {
    throw new AppError(403, "Access denied");
  }

  const { name, keywords, responseMessage, type, responseType, mediaUrl, matchMode, isCaseSensitive, status } = req.body;

  const [updated] = await db.update(autoResponses)
    .set({
      ...(name !== undefined && { name: name.trim() }),
      ...(keywords !== undefined && { keywords: keywords.trim() }),
      ...(responseMessage !== undefined && { responseMessage: responseMessage.trim() }),
      ...(type !== undefined && { type }),
      ...(responseType !== undefined && { responseType }),
      ...(mediaUrl !== undefined && { mediaUrl }),
      ...(matchMode !== undefined && { matchMode }),
      ...(isCaseSensitive !== undefined && { isCaseSensitive }),
      ...(status !== undefined && { status }),
      updatedAt: new Date(),
    })
    .where(eq(autoResponses.id, id))
    .returning();

  return res.json(updated);
});

// ─── DELETE /api/auto-responses/:id ──────────────────────────────────────
export const deleteAutoResponse = asyncHandler(async (req: Request, res: Response) => {
  const user = (req.session as any)?.user;
  if (!user) throw new AppError(401, "Not authenticated");

  const { id } = req.params;
  const existing = await db.query.autoResponses.findFirst({ where: eq(autoResponses.id, id) });
  if (!existing) throw new AppError(404, "Auto response not found");

  const ownedIds = await resolveOwnerChannelIds(req);
  if (ownedIds.length > 0 && !ownedIds.includes(existing.channelId)) {
    throw new AppError(403, "Access denied");
  }

  await db.delete(autoResponses).where(eq(autoResponses.id, id));
  return res.json({ success: true, message: "Auto response deleted" });
});

// ─── POST /api/auto-responses/:id/toggle ─────────────────────────────────
export const toggleAutoResponse = asyncHandler(async (req: Request, res: Response) => {
  const user = (req.session as any)?.user;
  if (!user) throw new AppError(401, "Not authenticated");

  const { id } = req.params;
  const existing = await db.query.autoResponses.findFirst({ where: eq(autoResponses.id, id) });
  if (!existing) throw new AppError(404, "Auto response not found");

  const ownedIds = await resolveOwnerChannelIds(req);
  if (ownedIds.length > 0 && !ownedIds.includes(existing.channelId)) {
    throw new AppError(403, "Access denied");
  }

  const newStatus = existing.status === "active" ? "paused" : "active";
  const [updated] = await db.update(autoResponses)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(autoResponses.id, id))
    .returning();

  return res.json(updated);
});

// ─── GET /api/auto-responses/stats?channelId=xxx ─────────────────────────
export const getAutoResponseStats = asyncHandler(async (req: Request, res: Response) => {
  const user = (req.session as any)?.user;
  if (!user) throw new AppError(401, "Not authenticated");

  const channelId = req.query.channelId as string | undefined;
  if (!channelId) throw new AppError(400, "channelId is required");

  const ownedIds = await resolveOwnerChannelIds(req);
  if (ownedIds.length > 0 && !ownedIds.includes(channelId)) {
    throw new AppError(403, "Access denied");
  }

  const rows = await db
    .select()
    .from(autoResponses)
    .where(eq(autoResponses.channelId, channelId));

  const totalRules = rows.length;
  const activeRules = rows.filter((r) => r.status === "active").length;
  const totalTriggers = rows.reduce((sum, r) => sum + (r.triggerCount || 0), 0);

  return res.json({ totalRules, activeRules, totalTriggers });
});

// ─── Exported utility for webhook pipeline ───────────────────────────────
/**
 * Check if an incoming message matches any active auto-response keyword rule
 * for the given channel. Returns the first matching rule, or null.
 */
export async function findMatchingAutoResponse(
  channelId: string,
  messageText: string
): Promise<typeof autoResponses.$inferSelect | null> {
  if (!channelId || !messageText) return null;

  const activeRules = await db
    .select()
    .from(autoResponses)
    .where(
      and(
        eq(autoResponses.channelId, channelId),
        eq(autoResponses.status, "active")
      )
    );

  for (const rule of activeRules) {
    const keywords = rule.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    for (const keyword of keywords) {
      const text = rule.isCaseSensitive ? messageText : messageText.toLowerCase();
      const kw = rule.isCaseSensitive ? keyword : keyword.toLowerCase();

      let matched = false;
      if (rule.matchMode === "exact") {
        matched = text === kw;
      } else if (rule.matchMode === "starts_with") {
        matched = text.startsWith(kw);
      } else {
        // default: contains
        matched = text.includes(kw);
      }

      if (matched) return rule;
    }
  }

  return null;
}

/**
 * Increment the triggerCount for a given auto-response rule.
 */
export async function incrementAutoResponseCount(id: string): Promise<void> {
  try {
    await db
      .update(autoResponses)
      .set({
        triggerCount: (autoResponses.triggerCount as any) + 1,
        updatedAt: new Date(),
      })
      .where(eq(autoResponses.id, id));
  } catch {
    // Non-critical — don't fail the webhook
  }
}
