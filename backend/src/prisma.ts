// A single, shared Prisma client for the whole backend.
//
// Creating a PrismaClient opens a pool of connections to MySQL. Creating one per
// request would exhaust the database's connection limit, so we create exactly one
// here and import it wherever we need database access.

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client";

// Prisma 7 talks to the database through a "driver adapter": a small package
// that knows the actual MySQL wire protocol. We must give it the connection URL.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill it in."
  );
}

const adapter = new PrismaMariaDb(databaseUrl);

export const prisma = new PrismaClient({ adapter });
