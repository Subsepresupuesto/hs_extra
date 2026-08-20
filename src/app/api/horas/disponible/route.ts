import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getLimites, legajoLiberado, periodoDeFecha, totalesLegajoPeriodo } from "@/lib/hours";

export async function GET(req: NextRequest) {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const legajo = searchParams.get("legajo")?.trim();
  const fecha = searchParams.get("fecha")?.trim();

  if (!legajo || !fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return NextResponse.json({ error: "Falta legajo o fecha válida." }, { status: 400 });
  }

  const periodo = periodoDeFecha(fecha);
  const totales = await totalesLegajoPeriodo(legajo, periodo);
  const limites = await getLimites();
  const liberado = await legajoLiberado(legajo, periodo);

  return NextResponse.json({ periodo, totales, limites, liberado });
}
