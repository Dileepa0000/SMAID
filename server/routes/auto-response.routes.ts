import type { Express } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import {
  getAutoResponses,
  createAutoResponse,
  updateAutoResponse,
  deleteAutoResponse,
  toggleAutoResponse,
  getAutoResponseStats,
} from "../controllers/auto-response.controller";

export function registerAutoResponseRoutes(app: Express) {
  // GET /api/auto-responses?channelId=xxx  — list all auto-responses for a channel
  app.get("/api/auto-responses", requireAuth, getAutoResponses);

  // GET /api/auto-responses/stats?channelId=xxx  — get stats
  app.get("/api/auto-responses/stats", requireAuth, getAutoResponseStats);

  // POST /api/auto-responses  — create new auto-response
  app.post("/api/auto-responses", requireAuth, createAutoResponse);

  // PUT /api/auto-responses/:id  — update existing auto-response
  app.put("/api/auto-responses/:id", requireAuth, updateAutoResponse);

  // DELETE /api/auto-responses/:id  — delete auto-response
  app.delete("/api/auto-responses/:id", requireAuth, deleteAutoResponse);

  // POST /api/auto-responses/:id/toggle  — toggle active/paused status
  app.post("/api/auto-responses/:id/toggle", requireAuth, toggleAutoResponse);
}
