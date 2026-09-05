import { Router } from "express";
import { healthRouter } from "./health.routes";

// The one place where every route group is attached to a URL.
//
// Reading this file tells you the application's complete public surface. When
// we add product search in Milestone 6, exactly one line appears here.

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
