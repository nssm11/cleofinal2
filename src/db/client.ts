import * as schema from "./schema";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

// Unified DB client: supports real PostgreSQL (pg) and local PGlite fallback.
// Decision is made synchronously at import time so `import { db } from "@/db"`
// keeps working without async changes. PGlite is used when:
//   - DATABASE_URL is missing or empty
//   - DATABASE_URL starts with "pglite:" or "file:"
//   - USE_PGLITE=1 is set
// Otherwise we use node-postgres. This keeps production on real Postgres
// while allowing `npm run dev` to work on machines without a system Postgres.

const databaseUrl = process.env.DATABASE_URL ?? "";
const forcePglite = process.env.USE_PGLITE === "1";
const isPgliteUrl =
  databaseUrl.startsWith("pglite:") ||
  databaseUrl.startsWith("file:") ||
  databaseUrl.startsWith(".pglite") ||
  databaseUrl === "";

const usePglite = forcePglite || isPgliteUrl;

type Schema = typeof schema;
type AppDb = NodePgDatabase<Schema>;
type AppTx = PgTransaction<any, Schema, any>;

let _db: AppDb;
let _pool: any;
let _client: any;

if (usePglite) {
  // Synchronous require to avoid top-level await in Next.js.
  const { PGlite } = require("@electric-sql/pglite") as typeof import("@electric-sql/pglite");
  const { unaccent } = require("@electric-sql/pglite/contrib/unaccent") as typeof import("@electric-sql/pglite/contrib/unaccent");
  const { drizzle: drizzlePglite } = require("drizzle-orm/pglite") as typeof import("drizzle-orm/pglite");
  const fs = require("node:fs") as typeof import("node:fs");
  const dataDir = process.env.PGLITE_DIR || ".pglite/data";
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {}
  const globalForPglite = globalThis as typeof globalThis & { __cleopatrePglite?: InstanceType<typeof PGlite> };
  let client: InstanceType<typeof PGlite>;
  if (globalForPglite.__cleopatrePglite) {
    client = globalForPglite.__cleopatrePglite;
  } else {
    client = new PGlite(dataDir, { extensions: { unaccent } } as any);
    if (process.env.NODE_ENV !== "production") globalForPglite.__cleopatrePglite = client;
    void (client as any).exec?.("CREATE EXTENSION IF NOT EXISTS unaccent").catch(() => {});
  }
  _client = client;
  const poolLike: any = client;
  poolLike.end = () => (client as any).close?.();
  poolLike.query = (client as any).query?.bind(client) ?? (client as any).exec?.bind(client);
  _pool = poolLike;
  _db = drizzlePglite({ client: client as any, schema }) as unknown as AppDb;
} else {
  const { Pool } = require("pg") as typeof import("pg");
  const { drizzle: drizzlePg } = require("drizzle-orm/node-postgres") as typeof import("drizzle-orm/node-postgres");
  const globalForDb = globalThis as typeof globalThis & { __cleopatrePool?: InstanceType<typeof Pool> };
  const pool =
    globalForDb.__cleopatrePool ??
    new Pool({ connectionString: databaseUrl, max: 10 });
  if (process.env.NODE_ENV !== "production") globalForDb.__cleopatrePool = pool;
  void pool.query("CREATE EXTENSION IF NOT EXISTS unaccent").catch(() => {});
  _pool = pool;
  _client = pool;
  _db = drizzlePg(pool as any, { schema }) as AppDb;
}

export const db: AppDb = _db;
export const pool: any = _pool;
export const client: any = _client;
export const isPglite = usePglite;
export type Db = AppDb;
export type Tx = AppTx;
