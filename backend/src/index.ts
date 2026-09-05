import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./prisma";

// This file has exactly one job: start the server.
//
// Everything about *what* the application does lives in app.ts and the layers
// below it. Keeping the two apart is what lets tests use the app without ever
// opening a network port.

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
  console.log(`Health check:        http://localhost:${env.port}/health`);
});

// Graceful shutdown. When you press Ctrl+C, Node would normally exit instantly
// and drop any open database connections. Instead we stop accepting new
// requests and close the connection pool cleanly.
async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
