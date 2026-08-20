import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbGet, dbRun } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id } = await params;

  const registro = await dbGet<{ id: number; area: string; cargadoPor: number; creadoFecha: string }>(
    `SELECT id, area, cargado_por as cargadoPor, date(created_at) as creadoFecha
     FROM horas_extra WHERE id = ?`,
    id
  );

  if (!registro) {
    return NextResponse.json({ error: "El registro no existe." }, { status: 404 });
  }

  if (user.role === "area") {
    const hoy = new Date().toISOString().slice(0, 10);
    if (registro.area !== user.areaName) {
      return NextResponse.json({ error: "No podés eliminar registros de otra área." }, { status: 403 });
    }
    if (registro.creadoFecha !== hoy) {
      return NextResponse.json(
        { error: "Solo se pueden eliminar cargas del mismo día. Pedile a la administración que lo corrija." },
        { status: 403 }
      );
    }
  }

  await dbRun("DELETE FROM horas_extra WHERE id = ?", id);
  return NextResponse.json({ ok: true });
}
