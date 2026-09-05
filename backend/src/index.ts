import "dotenv/config";
import express from "express";
import cors from "cors";

// Create the Express application. `app` is the object we attach routes to.
const app = express();

// Read configuration from the environment, with sensible defaults for local development.
const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

// The browser blocks requests from one origin (localhost:3000) to another
// (localhost:4000) unless the server explicitly allows it. This is CORS.
app.use(cors({ origin: FRONTEND_ORIGIN }));

// Parse incoming JSON request bodies into `req.body`.
app.use(express.json());

// Health check: a tiny endpoint whose only job is to prove the server is alive.
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "food-finder-backend",
    timestamp: new Date().toISOString(),
  });
});

// Start listening for HTTP requests.
app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
  console.log(`Health check:        http://localhost:${PORT}/health`);
});
