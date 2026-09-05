import { Router } from "express";
import { searchProductsHandler } from "../controllers/product.controller";

// Routes for product data. Mounted at "/products" in routes/index.ts, so the
// line below defines GET /products/search.

export const productRouter = Router();

productRouter.get("/search", searchProductsHandler);
