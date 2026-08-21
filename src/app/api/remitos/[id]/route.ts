import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { itemsRemito, obtenerRemito } from "@/lib/remitos";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const remito = await obtenerRemito(Number(id));
  if (!remito) {
    return NextResponse.json({ error: "El remito no existe." }, { status: 404 });
  }
  const items = await itemsRemito(Number(id));
  return NextResponse.json({ remito, items });
}
