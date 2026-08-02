import { Router } from "express";
import { payoutResolverService } from "../services/payout-resolver-service";
import { insertPayoutIssueSchema } from "@shared/schema";

const router = Router();

// GET /api/payout-issues/track - Public lookup by ID or Phone
router.get("/payout-issues/track", async (req, res) => {
  try {
    const query = (req.query.q || req.query.query || "") as string;
    if (!query) {
      return res.status(400).json({ success: false, message: "Ticket ID or Phone Number is required" });
    }
    const issues = await payoutResolverService.getIssueByIdOrPhone(query);
    return res.json({ success: true, data: issues });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/payout-issues - Get all reported payout issues
router.get("/payout-issues", async (req, res) => {
  try {
    const { status, channelId } = req.query;
    const issues = await payoutResolverService.getPayoutIssues(
      status as string,
      channelId as string
    );
    return res.json({ success: true, data: issues });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/payout-issues - Create a new payout issue (from Bot or Manual Intake)
router.post("/payout-issues", async (req, res) => {
  try {
    const validatedData = insertPayoutIssueSchema.parse(req.body);
    const issue = await payoutResolverService.createPayoutIssue(validatedData);
    return res.json({ success: true, data: issue });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
});

// POST /api/payout-issues/:id/approve - Approve payout retry (Admin only)
router.post("/payout-issues/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminUserId = (req.user as any)?.id || "admin";
    const updated = await payoutResolverService.approvePayoutIssue(id, adminUserId, notes);
    
    if (!updated) {
      return res.status(404).json({ success: false, message: "Payout issue not found" });
    }
    return res.json({ success: true, data: updated, message: "Payout approved for re-processing." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/payout-issues/:id/reject - Reject payout retry request (Admin only)
router.post("/payout-issues/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminUserId = (req.user as any)?.id || "admin";
    const updated = await payoutResolverService.rejectPayoutIssue(id, adminUserId, reason);
    
    if (!updated) {
      return res.status(404).json({ success: false, message: "Payout issue not found" });
    }
    return res.json({ success: true, data: updated, message: "Payout request rejected." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/payout-issues/:id/resolve - Mark payout issue as resolved
router.post("/payout-issues/:id/resolve", async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const updated = await payoutResolverService.resolvePayoutIssue(id, notes);
    
    if (!updated) {
      return res.status(404).json({ success: false, message: "Payout issue not found" });
    }
    return res.json({ success: true, data: updated, message: "Payout issue marked as resolved." });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
