// A single, shared Prisma client for the whole backend.
//
// Creating a PrismaClient opens a pool of connections to MySQL. Creating one per
// request would exhaust the database's connection limit, so we create exactly one
// here and import it wherever we need database access.

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client";
import { env } from "./config/env";

// Prisma 7 talks to the database through a "driver adapter": a small package
// that knows the actual MySQL wire protocol. We must give it the connection URL.
//
// The URL comes from config/env.ts, which has already checked that it is set and
// thrown a clear error if it is not.
const adapter = new PrismaMariaDb(env.databaseUrl);

export const prisma = new PrismaClient({ adapter });
