import { dbAll, dbGet, dbRun } from "@/lib/db";
import type { FilaExport } from "@/lib/excel";

export type Remito = {
  id: number;
  codigo: string;
  area: string | null;
  desde: string;
  hasta: string;
  estado: "borrador" | "confirmado" | "anulado";
  creadoPorUsuario: string;
  createdAt: string;
  confirmadoPorUsuario: string | null;
  confirmadoAt: string | null;
  anuladoPorUsuario: string | null;
  anuladoAt: string | null;
  motivoAnulacion: string | null;
};

function whereHoras(area: string | null, desde: string, hasta: string) {
  const clauses = ["remito_id IS NULL", "periodo >= ?", "periodo <= ?"];
  const params: (string | number)[] = [desde, hasta];
  if (area) {
    clauses.push("area = ?");
    params.push(area);
  }
  return { where: clauses.join(" AND "), params };
}

export async function candidatosRemito(area: string | null, desde: string, hasta: string) {
  const { where, params } = whereHoras(area, desde, hasta);
  return dbAll<{ id: number }>(`SELECT id FROM horas_extra WHERE ${where}`, ...params);
}

export async function crearRemito(params: {
  area: string | null;
  desde: string;
  hasta: string;
  userId: number;
  username: string;
}): Promise<{ ok: true; remito: Remito } | { ok: false; error: string }> {
  const { area, desde, hasta, userId, username } = params;

  const candidatos = await candidatosRemito(area, desde, hasta);
  if (candidatos.length === 0) {
    return {
      ok: false,
      error:
        "No hay horas disponibles para ese filtro (o ya están todas incluidas en otro remito).",
    };
  }

  const inserted = await dbRun(
    `INSERT INTO remitos (area, desde, hasta, estado, creado_por, creado_por_usuario)
     VALUES (?, ?, ?, 'borrador', ?, ?)`,
    area,
    desde,
    hasta,
    userId,
    username
  );
  const remitoId = inserted.lastRowId;

  const codigo = `REM-${String(remitoId).padStart(6, "0")}`;
  await dbRun("UPDATE remitos SET codigo = ? WHERE id = ?", codigo, remitoId);

  const { where, params: whereParams } = whereHoras(area, desde, hasta);
  await dbRun(`UPDATE horas_extra SET remito_id = ? WHERE ${where}`, remitoId, ...whereParams);

  const remito = await obtenerRemito(remitoId);
  if (!remito) return { ok: false, error: "No se pudo crear el remito." };
  return { ok: true, remito };
}

export async function listarRemitos(area: string | null = null): Promise<Remito[]> {
  const where = area ? "WHERE area = ?" : "";
  const params = area ? [area] : [];
  return dbAll<Remito>(
    `SELECT id, codigo, area, desde, hasta, estado,
            creado_por_usuario as creadoPorUsuario, created_at as createdAt,
            confirmado_por_usuario as confirmadoPorUsuario, confirmado_at as confirmadoAt,
            anulado_por_usuario as anuladoPorUsuario, anulado_at as anuladoAt,
            motivo_anulacion as motivoAnulacion
     FROM remitos ${where} ORDER BY created_at DESC`,
    ...params
  );
}

export async function obtenerRemito(id: number): Promise<Remito | undefined> {
  return dbGet<Remito>(
    `SELECT id, codigo, area, desde, hasta, estado,
            creado_por_usuario as creadoPorUsuario, created_at as createdAt,
            confirmado_por_usuario as confirmadoPorUsuario, confirmado_at as confirmadoAt,
            anulado_por_usuario as anuladoPorUsuario, anulado_at as anuladoAt,
            motivo_anulacion as motivoAnulacion
     FROM remitos WHERE id = ?`,
    id
  );
}

export async function itemsRemito(id: number): Promise<FilaExport[]> {
  return dbAll<FilaExport>(
    `SELECT area, legajo, nombre, apellido, fecha, horas_50 as horas50, horas_100 as horas100,
            motivo, cargado_por_usuario as cargadoPorUsuario, created_at as createdAt
     FROM horas_extra WHERE remito_id = ? ORDER BY area, fecha, legajo`,
    id
  );
}

export async function confirmarRemito(
  id: number,
  username: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const remito = await obtenerRemito(id);
  if (!remito) return { ok: false, error: "El remito no existe." };
  if (remito.estado !== "borrador") {
    return { ok: false, error: "Ese remito ya fue confirmado o anulado." };
  }
  await dbRun(
    "UPDATE remitos SET estado = 'confirmado', confirmado_por_usuario = ?, confirmado_at = datetime('now') WHERE id = ?",
    username,
    id
  );
  return { ok: true };
}

export async function anularRemito(
  id: number,
  username: string,
  motivo: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const remito = await obtenerRemito(id);
  if (!remito) return { ok: false, error: "El remito no existe." };
  if (remito.estado === "anulado") {
    return { ok: false, error: "Ese remito ya está anulado." };
  }
  await dbRun(
    "UPDATE remitos SET estado = 'anulado', anulado_por_usuario = ?, anulado_at = datetime('now'), motivo_anulacion = ? WHERE id = ?",
    username,
    motivo,
    id
  );
  // Libera las horas para que puedan incluirse en un remito nuevo.
  await dbRun("UPDATE horas_extra SET remito_id = NULL WHERE remito_id = ?", id);
  return { ok: true };
}
