import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import { chequearLimite, chequearVentanaCarga, getLimites, getVentanaCarga, periodoActual } from "@/lib/hours";

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
    clauses.push("h.area = ?");
    params.push(user.areaName ?? "");
  } else if (area) {
    clauses.push("h.area = ?");
    params.push(area);
  }

  if (legajo) {
    clauses.push("h.legajo LIKE ?");
    params.push(`%${legajo}%`);
  }
  if (desde) {
    clauses.push("h.periodo >= ?");
    params.push(desde);
  }
  if (hasta) {
    clauses.push("h.periodo <= ?");
    params.push(hasta);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await dbAll(
    `SELECT h.id, h.legajo, h.nombre, h.apellido, h.area, h.fecha, h.periodo,
            h.horas_50 as horas50, h.horas_100 as horas100,
            h.motivo, h.cargado_por_usuario as cargadoPorUsuario, h.created_at as createdAt,
            r.codigo as remitoCodigo
     FROM horas_extra h
     LEFT JOIN remitos r ON r.id = h.remito_id
     ${where}
     ORDER BY h.periodo DESC, h.id DESC
     LIMIT 1000`,
    ...params
  );

  return NextResponse.json({ registros: rows });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["area", "carga", "admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;

  let area: string;
  if (user.role === "area" || user.role === "carga") {
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
      "SELECT 1 FROM users WHERE role IN ('area','carga') AND area_name = ? AND activo = 1",
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
  const periodo = String(body?.periodo ?? "").trim();
  const horas50 = Number(body?.horas50 ?? 0);
  const horas100 = Number(body?.horas100 ?? 0);
  const motivo = body?.motivo ? String(body.motivo).trim() : null;

  if (!legajo || !nombre || !apellido || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: "Faltan datos obligatorios o el mes es inválido." }, { status: 400 });
  }
  if (periodo > periodoActual()) {
    return NextResponse.json({ error: "No se pueden cargar horas de meses futuros." }, { status: 400 });
  }
  if (!Number.isFinite(horas50) || !Number.isFinite(horas100) || horas50 < 0 || horas100 < 0) {
    return NextResponse.json({ error: "Las horas deben ser números válidos y no negativos." }, { status: 400 });
  }
  if (horas50 === 0 && horas100 === 0) {
    return NextResponse.json({ error: "Cargá al menos horas al 50% o al 100%." }, { status: 400 });
  }

  if (user.role !== "admin") {
    const ventana = await getVentanaCarga();
    const chequeoVentana = chequearVentanaCarga(ventana);
    if (!chequeoVentana.ok) {
      return NextResponse.json({ error: chequeoVentana.motivoPublico }, { status: 403 });
    }
  }

  const fecha = `${periodo}-01`;
  const limites = await getLimites();
  const check = await chequearLimite({ legajo, periodo, horas50Nuevas: horas50, horas100Nuevas: horas100, limites });
  if (!check.ok) {
    return NextResponse.json({ error: user.role === "admin" ? check.motivoAdmin : check.motivoPublico }, { status: 409 });
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
