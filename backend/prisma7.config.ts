// Prisma's configuration file.
//
// It tells the Prisma CLI where the schema lives, where migration files go,
// and how to connect to MySQL. The connection details come from environment
// variables (loaded from .env by dotenv), never from this file directly.

import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
    // Scratch database Prisma uses to check migrations during development.
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
