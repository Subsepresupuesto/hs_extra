import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { crearRemito, listarRemitos } from "@/lib/remitos";

export async function GET() {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const remitos = await listarRemitos(user.role === "area" ? user.areaName : null);
  return NextResponse.json({ remitos });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const periodo = String(body?.periodo ?? "").trim();

  let area: string | null;
  if (user.role === "area") {
    if (!user.areaName) {
      return NextResponse.json(
        { error: "Tu usuario no tiene un área asignada. Contactá a la administración." },
        { status: 400 }
      );
    }
    area = user.areaName;
  } else {
    area = body?.area ? String(body.area).trim() : null;
  }

  if (!/^\d{4}-\d{2}$/.test(periodo)) {
    return NextResponse.json({ error: "Elegí un mes válido." }, { status: 400 });
  }

  const resultado = await crearRemito({
    area,
    desde: periodo,
    hasta: periodo,
    userId: user.id,
    username: user.username,
  });
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 409 });
  }
  return NextResponse.json({ remito: resultado.remito });
}
