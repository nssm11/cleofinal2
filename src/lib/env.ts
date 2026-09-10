import { z } from "zod";

/**
 * Known-insecure secret defaults we refuse silently in production.
 */
const INSECURE_SECRETS = new Set([
  "cleopatre-dev-secret-change-me-please",
  "change-me-to-a-long-random-string",
  "changeme",
  "secret",
]);

const schema = z.object({
  // Accepts either a standard postgres URL or the unix-socket form
  // postgres://user:pass@/db?host=/path used by embedded/local Postgres.
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(16).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  // Only trust x-forwarded-for when we actually sit behind a reverse proxy we
  // control. Otherwise attackers can rotate the header and bypass rate limits.
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(1).max(10).default(1),
});

const parsed = schema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NODE_ENV: process.env.NODE_ENV,
  TRUST_PROXY: process.env.TRUST_PROXY,
  TRUST_PROXY_HOPS: process.env.TRUST_PROXY_HOPS,
});

const isProduction = parsed.NODE_ENV === "production";

if (isProduction) {
  const problems: string[] = [];
  if (!parsed.SESSION_SECRET) {
    problems.push("SESSION_SECRET is required in production (32+ random bytes).");
  } else if (parsed.SESSION_SECRET.length < 32) {
    problems.push("SESSION_SECRET must be at least 32 characters in production.");
  } else if (INSECURE_SECRETS.has(parsed.SESSION_SECRET)) {
    problems.push("SESSION_SECRET is a known placeholder; generate a real one.");
  }
  if (problems.length) {
    throw new Error(`Refusing to start with unsafe production configuration:\n- ${problems.join("\n- ")}`);
  }
  if (!parsed.TRUST_PROXY) {
    console.warn(
      "[env] TRUST_PROXY is not set. Rate limiting will be keyed to a single " +
        "shared client — set TRUST_PROXY=true if running behind a proxy.",
    );
  }
}

export const env = {
  ...parsed,
  // Stable dev fallback so local setup doesn't need a real secret.
  SESSION_SECRET: parsed.SESSION_SECRET ?? "cleopatre-dev-secret-change-me-please",
} as const;

export const SITE_URL = env.NEXT_PUBLIC_SITE_URL;
export const SITE_NAME = "Cléopâtre — Espace Santé Beauté";
export const IS_PRODUCTION = isProduction;
