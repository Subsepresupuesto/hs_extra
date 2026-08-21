import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { itemsRemito, obtenerRemito } from "@/lib/remitos";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id } = await params;

  const remito = await obtenerRemito(Number(id));
  if (!remito) {
    return NextResponse.json({ error: "El remito no existe." }, { status: 404 });
  }
  if (user.role === "area" && remito.area !== user.areaName) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  const items = await itemsRemito(Number(id));
  return NextResponse.json({ remito, items });
}
