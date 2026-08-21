import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { anularRemito, obtenerRemito } from "@/lib/remitos";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const motivo = body?.motivo ? String(body.motivo).trim() : null;

  const resultado = await anularRemito(Number(id), user.username, motivo || null);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
