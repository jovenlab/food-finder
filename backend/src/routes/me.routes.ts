import { Router } from "express";
import { getMeHandler } from "../controllers/me.controller";

// Mounted at "/me", so the line below defines GET /me.

export const meRouter = Router();

meRouter.get("/", getMeHandler);
