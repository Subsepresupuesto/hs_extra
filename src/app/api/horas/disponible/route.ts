import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getLimites, legajoLiberado, totalesLegajoPeriodo } from "@/lib/hours";

// Solo admin: expone el mecanismo de topes/liberación, que el resto de los
// usuarios no debe conocer (ver pedido de ocultar esa información).
export async function GET(req: NextRequest) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const legajo = searchParams.get("legajo")?.trim();
  const periodo = searchParams.get("periodo")?.trim();

  if (!legajo || !periodo || !/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: "Falta legajo o período válido." }, { status: 400 });
  }

  const totales = await totalesLegajoPeriodo(legajo, periodo);
  const limites = await getLimites();
  const liberado = await legajoLiberado(legajo, periodo);

  return NextResponse.json({ periodo, totales, limites, liberado });
}
