import { Router } from "express";
import { stripeWebhookHandler } from "../controllers/webhook.controller";

// Mounted at "/stripe", so the line below defines POST /stripe/webhook.
//
// The raw-body parser this route depends on is registered in app.ts, not here -
// it has to run before express.json(), which is a decision about middleware
// ORDER and therefore belongs where the order is visible.

export const webhookRouter = Router();

webhookRouter.post("/webhook", stripeWebhookHandler);
