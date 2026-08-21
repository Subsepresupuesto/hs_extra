import { getCloudflareContext } from "@opennextjs/cloudflare";

export type Role = "area" | "carga" | "admin";

async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

export async function dbGet<T = unknown>(sql: string, ...params: unknown[]): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.prepare(sql).bind(...params).first<T>();
  return row ?? undefined;
}

export async function dbAll<T = unknown>(sql: string, ...params: unknown[]): Promise<T[]> {
  const db = await getDb();
  const { results } = await db.prepare(sql).bind(...params).all<T>();
  return results;
}

export async function dbRun(sql: string, ...params: unknown[]): Promise<{ lastRowId: number }> {
  const db = await getDb();
  const result = await db.prepare(sql).bind(...params).run();
  return { lastRowId: result.meta.last_row_id };
}
