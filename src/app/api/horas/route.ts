import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import { chequearLimite, getLimites, periodoDeFecha } from "@/lib/hours";

export async function GET(req: NextRequest) {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area");
  const legajo = searchParams.get("legajo");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (user.role === "area") {
    clauses.push("area = ?");
    params.push(user.areaName ?? "");
  } else if (area) {
    clauses.push("area = ?");
    params.push(area);
  }

  if (legajo) {
    clauses.push("legajo LIKE ?");
    params.push(`%${legajo}%`);
  }
  if (desde) {
    clauses.push("fecha >= ?");
    params.push(desde);
  }
  if (hasta) {
    clauses.push("fecha <= ?");
    params.push(hasta);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await dbAll(
    `SELECT id, legajo, nombre, apellido, area, fecha, horas_50 as horas50, horas_100 as horas100,
            motivo, cargado_por_usuario as cargadoPorUsuario, created_at as createdAt
     FROM horas_extra ${where}
     ORDER BY fecha DESC, id DESC
     LIMIT 1000`,
    ...params
  );

  return NextResponse.json({ registros: rows });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  let area: string;
  if (user.role === "area") {
    if (!user.areaName) {
      return NextResponse.json(
        { error: "Tu usuario no tiene un área asignada. Contactá a la administración." },
        { status: 400 }
      );
    }
    area = user.areaName;
  } else {
    const areaSolicitada = String(body?.area ?? "").trim();
    const existe = await dbGet(
      "SELECT 1 FROM users WHERE role = 'area' AND area_name = ? AND activo = 1",
      areaSolicitada
    );
    if (!areaSolicitada || !existe) {
      return NextResponse.json({ error: "Elegí un área válida." }, { status: 400 });
    }
    area = areaSolicitada;
  }

  const legajo = String(body?.legajo ?? "").trim();
  const nombre = String(body?.nombre ?? "").trim();
  const apellido = String(body?.apellido ?? "").trim();
  const fecha = String(body?.fecha ?? "").trim();
  const horas50 = Number(body?.horas50 ?? 0);
  const horas100 = Number(body?.horas100 ?? 0);
  const motivo = body?.motivo ? String(body.motivo).trim() : null;

  if (!legajo || !nombre || !apellido || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Faltan datos obligatorios o la fecha es inválida." }, { status: 400 });
  }
  if (!Number.isFinite(horas50) || !Number.isFinite(horas100) || horas50 < 0 || horas100 < 0) {
    return NextResponse.json({ error: "Las horas deben ser números válidos y no negativos." }, { status: 400 });
  }
  if (horas50 === 0 && horas100 === 0) {
    return NextResponse.json({ error: "Cargá al menos horas al 50% o al 100%." }, { status: 400 });
  }

  const periodo = periodoDeFecha(fecha);
  const limites = await getLimites();
  const check = await chequearLimite({ legajo, periodo, horas50Nuevas: horas50, horas100Nuevas: horas100, limites });
  if (!check.ok) {
    return NextResponse.json({ error: check.motivo }, { status: 409 });
  }

  await dbRun(
    `INSERT INTO horas_extra
      (legajo, nombre, apellido, area, fecha, periodo, horas_50, horas_100, motivo, cargado_por, cargado_por_usuario)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    legajo,
    nombre,
    apellido,
    area,
    fecha,
    periodo,
    horas50,
    horas100,
    motivo,
    user.id,
    user.username
  );

  return NextResponse.json({ ok: true });
}
