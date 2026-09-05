import { Router } from "express";
import { createCheckoutSessionHandler } from "../controllers/checkout.controller";

// Mounted at "/checkout", so the line below defines POST /checkout/session.

export const checkoutRouter = Router();

checkoutRouter.post("/session", createCheckoutSessionHandler);
