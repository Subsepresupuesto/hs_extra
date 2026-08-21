import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { crearRemito, listarRemitos } from "@/lib/remitos";

export async function GET() {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const remitos = await listarRemitos();
  return NextResponse.json({ remitos });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const area = body?.area ? String(body.area).trim() : null;
  const desde = String(body?.desde ?? "").trim();
  const hasta = String(body?.hasta ?? "").trim();

  if (!/^\d{4}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}$/.test(hasta)) {
    return NextResponse.json({ error: "Rango de meses inválido." }, { status: 400 });
  }
  if (desde > hasta) {
    return NextResponse.json({ error: '"Desde" no puede ser posterior a "hasta".' }, { status: 400 });
  }

  const resultado = await crearRemito({ area, desde, hasta, userId: user.id, username: user.username });
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 409 });
  }
  return NextResponse.json({ remito: resultado.remito });
}
