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

// Ejecuta varias sentencias en un solo viaje de red (D1 .batch()), mucho más
// rápido que awaitear cada una por separado. Todas se ejecutan igual, no se
// interrumpen entre sí si una falla.
export async function dbBatch(statements: { sql: string; params: unknown[] }[]): Promise<void> {
  if (statements.length === 0) return;
  const db = await getDb();
  const prepared = statements.map((s) => db.prepare(s.sql).bind(...s.params));
  await db.batch(prepared);
}
