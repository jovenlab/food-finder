import { Router } from "express";
import { healthRouter } from "./health.routes";
import { productRouter } from "./product.routes";
import { searchRouter } from "./search.routes";
import { meRouter } from "./me.routes";
import { checkoutRouter } from "./checkout.routes";

// The one place where every route group is attached to a URL.
//
// Reading this file tells you the application's complete public surface.

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/searches", searchRouter);
apiRouter.use("/me", meRouter);
apiRouter.use("/checkout", checkoutRouter);
