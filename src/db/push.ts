import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db, pool, isPglite } from "./client";

async function main() {
  console.log(`→ DB push (${isPglite ? "PGlite" : "PostgreSQL"})`);
  // Ensure unaccent extension
  try {
    await pool.query?.("CREATE EXTENSION IF NOT EXISTS unaccent");
  } catch {}
  try {
    await (db as any).execute?.(sql`CREATE EXTENSION IF NOT EXISTS unaccent`);
  } catch {}

  // Check if tables exist
  let hasTables = false;
  try {
    const r = await pool.query("SELECT to_regclass('public.users') as t");
    const row = Array.isArray(r) ? r[0] : (r as any).rows?.[0];
    hasTables = !!(row?.t ?? r?.rows?.[0]?.t);
    // pglite returns different shape
    if ((r as any).rows) hasTables = !!r.rows[0]?.t;
    if (Array.isArray(r) && (r as any)[0]?.t) hasTables = true;
  } catch {
    hasTables = false;
  }
  // Also try drizzle way
  if (!hasTables) {
    try {
      await db.execute(sql`SELECT 1 FROM users LIMIT 1`);
      hasTables = true;
    } catch {
      hasTables = false;
    }
  }

  if (hasTables) {
    console.log("✓ Tables already exist — skipping push (use drizzle-kit push for incremental changes)");
    // For pg, attempt drizzle-kit push if available and not pglite
    if (!isPglite) {
      console.log("ℹ If schema changed, run: npx drizzle-kit push");
    }
    await pool.end?.();
    return;
  }

  const migrationPath = path.join(process.cwd(), "drizzle", "0000_chunky_fenris.sql");
  if (!fs.existsSync(migrationPath)) {
    console.error(`✖ Migration file not found: ${migrationPath}`);
    console.error("  Run: npx drizzle-kit generate");
    process.exit(1);
  }
  const raw = fs.readFileSync(migrationPath, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`→ Applying ${statements.length} statements from drizzle/0000_chunky_fenris.sql`);
  for (const stmt of statements) {
    const sqlText = stmt.trim();
    if (!sqlText) continue;
    try {
      // Use pool.query for both pg and pglite (pglite has query)
      if (typeof (pool as any).query === "function") {
        await (pool as any).query(sqlText);
      } else if (typeof (pool as any).exec === "function") {
        await (pool as any).exec(sqlText);
      } else {
        await (db as any).execute(sql`${sqlText}`);
      }
    } catch (e: any) {
      // Ignore "already exists" errors when re-running on existing DB
      const msg = String(e?.message ?? "");
      if (msg.includes("already exists") || msg.includes("duplicate key")) {
        continue;
      }
      console.error(`✖ Failed statement: ${sqlText.slice(0, 120)}...`);
      console.error(e);
      process.exit(1);
    }
  }
  console.log("✓ Schema pushed");
  await pool.end?.();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await pool.end?.();
  } catch {}
  process.exit(1);
});
