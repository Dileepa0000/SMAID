import { db } from "../db";
import { payoutIssues, InsertPayoutIssue, PayoutIssue } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export class PayoutResolverService {
  /**
   * Create a new payout issue (e.g. from WhatsApp Bot or Customer input)
   */
  async createPayoutIssue(data: InsertPayoutIssue): Promise<PayoutIssue> {
    const [issue] = await db
      .insert(payoutIssues)
      .values({
        ...data,
        // status defaults to "pending_approval" via schema, but force it here too
        status: "pending_approval",
      })
      .returning();
    return issue;
  }

  /**
   * Get all payout issues (filtered by status or channel)
   */
  async getPayoutIssues(status?: string, channelId?: string): Promise<PayoutIssue[]> {
    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(payoutIssues.status, status as any));
    }
    if (channelId) {
      conditions.push(eq(payoutIssues.channelId, channelId));
    }

    return db
      .select()
      .from(payoutIssues)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payoutIssues.createdAt));
  }

  /**
   * Approve a payout issue retry by Admin
   */
  async approvePayoutIssue(
    issueId: string,
    adminUserId: string,
    notes?: string
  ): Promise<PayoutIssue | null> {
    const [updated] = await db
      .update(payoutIssues)
      .set({
        status: "approved",
        approvedBy: adminUserId,
        approvedAt: new Date(),
        adminNotes: notes || "Approved for re-processing by Admin.",
        updatedAt: new Date(),
      })
      .where(eq(payoutIssues.id, issueId))
      .returning();

    return updated || null;
  }

  /**
   * Reject a payout issue by Admin
   */
  async rejectPayoutIssue(
    issueId: string,
    adminUserId: string,
    reason: string
  ): Promise<PayoutIssue | null> {
    const [updated] = await db
      .update(payoutIssues)
      .set({
        status: "rejected",
        approvedBy: adminUserId,
        adminNotes: reason,
        updatedAt: new Date(),
      })
      .where(eq(payoutIssues.id, issueId))
      .returning();

    return updated || null;
  }

  /**
   * Mark a payout issue as fully resolved
   */
  async resolvePayoutIssue(issueId: string, notes?: string): Promise<PayoutIssue | null> {
    const [updated] = await db
      .update(payoutIssues)
      .set({
        status: "resolved",
        adminNotes: notes || "Payout reprocessed and completed successfully.",
        updatedAt: new Date(),
      })
      .where(eq(payoutIssues.id, issueId))
      .returning();

    return updated || null;
  }
}

export const payoutResolverService = new PayoutResolverService();
