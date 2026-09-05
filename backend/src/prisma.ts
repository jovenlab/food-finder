// A single, shared Prisma client for the whole backend.
//
// Creating a PrismaClient opens a pool of connections to MySQL. Creating one per
// request would exhaust the database's connection limit, so we create exactly one
// here and import it wherever we need database access.

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client";
import { env } from "./config/env";

// MySQL 8 authenticates with `caching_sha2_password`.
//
// The name is literal: the server CACHES a successful authentication. While that
// cache is warm, connecting works. After the server restarts the cache is empty,
// and the client must then complete a full RSA exchange - for which it needs the
// server's public key. The MariaDB driver refuses to fetch that key unless told
// it may, and fails with:
//
//   "RSA public key is not available client side. Either set option
//    `cachingRsaPublicKey` ... or allow public key retrieval"
//
// which is a confusing error precisely because it appears only after a restart,
// on a setup that worked yesterday.
//
// Fetching the key over an unencrypted connection is theoretically interceptable,
// so we enable it ONLY for connections to this machine, where there is no network
// path for anyone to sit in. A remote database should use TLS instead, and this
// function deliberately leaves such a URL untouched.
function allowLocalPublicKeyRetrieval(databaseUrl: string): string {
  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    // Not a URL we can parse - hand it to the driver unchanged and let it
    // produce its own error rather than swallowing the problem here.
    return databaseUrl;
  }

  const isLocal = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);

  if (isLocal && !url.searchParams.has("allowPublicKeyRetrieval")) {
    url.searchParams.set("allowPublicKeyRetrieval", "true");
  }

  return url.toString();
}

// Prisma 7 talks to the database through a "driver adapter": a small package
// that knows the actual MySQL wire protocol. We must give it the connection URL.
//
// The URL comes from config/env.ts, which has already checked that it is set and
// thrown a clear error if it is not.
const adapter = new PrismaMariaDb(allowLocalPublicKeyRetrieval(env.databaseUrl));

export const prisma = new PrismaClient({ adapter });
