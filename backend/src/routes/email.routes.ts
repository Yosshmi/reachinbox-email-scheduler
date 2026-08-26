import { Router } from "express";

import { getScheduledEmails, getSentEmails, scheduleEmails } from "../controllers/email.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const emailRouter = Router();
emailRouter.use(requireAuth);
emailRouter.post("/schedule", scheduleEmails);
emailRouter.get("/scheduled", getScheduledEmails);
emailRouter.get("/sent", getSentEmails);
