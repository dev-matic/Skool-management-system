import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { serverEnv } from "@/env";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { skoolPool?: Pool; skoolDb?: Database };

export function getPool(): Pool {
  if (!globalForDb.skoolPool) {
    globalForDb.skoolPool = new Pool({
      connectionString: serverEnv().DATABASE_URL,
      max: 10,
    });
  }
  return globalForDb.skoolPool;
}

export function getDb(): Database {
  if (!globalForDb.skoolDb) {
    globalForDb.skoolDb = drizzle(getPool(), { schema });
  }
  return globalForDb.skoolDb;
}
