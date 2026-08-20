import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbGet } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ legajo: string }> }) {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;
  const { legajo } = await params;

  const registro = await dbGet<{ nombre: string; apellido: string }>(
    `SELECT nombre, apellido FROM horas_extra WHERE legajo = ? ORDER BY created_at DESC LIMIT 1`,
    legajo
  );

  return NextResponse.json({ encontrado: !!registro, nombre: registro?.nombre ?? null, apellido: registro?.apellido ?? null });
}
