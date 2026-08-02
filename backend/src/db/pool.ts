import { Pool } from "pg";
import { env } from "../config/env.js";
import { HttpError } from "../errors/httpError.js";

let pool: Pool | null = null;

export function getPool() {
  if (!env.databaseUrl) {
    throw new HttpError(500, "DATABASE_URL is not configured.");
  }

  pool ??= new Pool({
    connectionString: env.databaseUrl,
    ssl: env.databaseUrl.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined
  });

  return pool;
}
