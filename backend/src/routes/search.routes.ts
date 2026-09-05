import { Router } from "express";
import { getRecentSearchesHandler } from "../controllers/search.controller";

// Routes for the demo user's search history. Mounted at "/searches", so the
// line below defines GET /searches/recent.

export const searchRouter = Router();

searchRouter.get("/recent", getRecentSearchesHandler);
