import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { confirmarRemito, obtenerRemito } from "@/lib/remitos";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id } = await params;

  if (user.role === "area") {
    const remito = await obtenerRemito(Number(id));
    if (!remito || remito.area !== user.areaName) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
  }

  const resultado = await confirmarRemito(Number(id), user.username);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
