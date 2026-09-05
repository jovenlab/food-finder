import { Router } from "express";
import { getHealth } from "../controllers/health.controller";

// A Router is a miniature Express application: a group of related routes that
// can be attached to a URL prefix in a single line (see routes/index.ts).

export const healthRouter = Router();

// "/" here means the router's own root. Because routes/index.ts mounts this
// router at "/health", this line defines GET /health.
healthRouter.get("/", getHealth);
