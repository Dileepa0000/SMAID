import { db } from "../db";
import { payoutIssues, InsertPayoutIssue, PayoutIssue } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { storage } from "../storage";
import { WhatsAppApiService } from "./whatsapp-api";

export class PayoutResolverService {
  /**
   * Send WhatsApp notification to customer when issue status changes
   */
  private async notifyCustomer(issue: PayoutIssue, statusText: string, note?: string) {
    try {
      if (!issue.customerPhone) return;
      let channel = issue.channelId ? await storage.getChannel(issue.channelId) : null;
      if (!channel) {
        const channels = await storage.getChannels();
        channel = channels.find((c) => c.isActive) || channels[0];
      }
      if (channel && channel.accessToken) {
        const waApi = new WhatsAppApiService(channel);
        const name = issue.customerName ? `Hi ${issue.customerName}, ` : "Hi, ";
        const issueId = issue.id.slice(0, 8);
        let msg = `🔔 *SMAID Update - Issue #${issueId}*\n\n${name}your payout recovery request status has been updated to: *${statusText.toUpperCase()}*`;
        if (note) {
          msg += `\n\n📌 *Notes:* ${note}`;
        }
        msg += `\n\nThank you for choosing SMAID! 🙏`;
        await waApi.sendTextMessage(issue.customerPhone, msg);
        console.log(`[PayoutResolver] WhatsApp notification sent to ${issue.customerPhone}`);
      }
    } catch (err) {
      console.error("[PayoutResolver] Failed to send WhatsApp notification:", err);
    }
  }

  /**
   * Create a new payout issue (e.g. from WhatsApp Bot or Customer input)
   */
  async createPayoutIssue(data: InsertPayoutIssue): Promise<PayoutIssue> {
    const [issue] = await db
      .insert(payoutIssues)
      .values({
        ...data,
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

    if (updated) {
      void this.notifyCustomer(updated, "approved", updated.adminNotes || undefined);
    }

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

    if (updated) {
      void this.notifyCustomer(updated, "rejected", reason);
    }

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

    if (updated) {
      void this.notifyCustomer(updated, "resolved", updated.adminNotes || undefined);
    }

    return updated || null;
  }
}

export const payoutResolverService = new PayoutResolverService();

