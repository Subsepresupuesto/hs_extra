import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbAll, dbRun } from "@/lib/db";

export async function GET() {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const rows = await dbAll(
    `SELECT id, legajo, nombre, apellido, periodo, motivo, activo, created_at as createdAt
     FROM legajos_liberados ORDER BY activo DESC, created_at DESC`
  );

  return NextResponse.json({ liberados: rows });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const legajo = String(body?.legajo ?? "").trim();
  const nombre = body?.nombre ? String(body.nombre).trim() : null;
  const apellido = body?.apellido ? String(body.apellido).trim() : null;
  const periodo = body?.periodo ? String(body.periodo).trim() : null; // YYYY-MM o null = indefinido
  const motivo = body?.motivo ? String(body.motivo).trim() : null;

  if (!legajo) {
    return NextResponse.json({ error: "El legajo es obligatorio." }, { status: 400 });
  }
  if (periodo && !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: "El período debe tener formato AAAA-MM o dejarse vacío." }, { status: 400 });
  }

  await dbRun(
    `INSERT INTO legajos_liberados (legajo, nombre, apellido, periodo, motivo, creado_por)
     VALUES (?, ?, ?, ?, ?, ?)`,
    legajo,
    nombre,
    apellido,
    periodo,
    motivo,
    user.id
  );

  return NextResponse.json({ ok: true });
}
